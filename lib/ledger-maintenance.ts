/**
 * Pure decisions for the settlement-ledger maintenance scripts.
 *
 * Two jobs, both unit-testable without a database:
 *
 * - Backfill: before the settlement model existed, a split could be marked
 *   settled with `settledAt` while carrying no payment. The rebuild derives
 *   cleared amounts from payments alone, so those splits would silently reopen.
 *   `planBackfill` decides which rows need a synthetic payment and which must be
 *   left alone.
 * - Reconcile: after a rebuild, assert the ledger invariants rather than trust
 *   the projection.
 *
 * Integer minor units (`cents`) throughout, like the allocation engine. The
 * scripts convert `Decimal` at the edge; nothing here touches Prisma or I/O.
 */

import { settlementPairKey } from '@/lib/settlements';

/** Marker on every synthetic row the backfill writes, for humans reading the DB. */
export const BACKFILL_NOTE = 'Backfilled';

/**
 * Deterministic idempotency key. `Settlement.requestId` is unique, so a second
 * run inserts nothing for a split it already backfilled.
 */
export function backfillRequestId(splitId: string): string {
  return `backfill:${splitId}`;
}

export type BackfillSplit = {
  id: string;
  /** The debtor — who owes this share. */
  debtorId: string;
  /** The payer — who covered the expense. */
  creditorId: string;
  amountCents: number;
  settledCents: number;
  settledAt: Date | null;
  currency: string;
  /** Soft-deleted expense, or an expense in a soft-deleted group. */
  inactiveExpense: boolean;
};

export type BackfillSkipReason =
  | 'not-settled'
  | 'inactive-expense'
  | 'zero-amount'
  | 'self-pair'
  | 'already-projected'
  | 'already-backfilled';

export type BackfillCandidate = {
  splitId: string;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currency: string;
  occurredAt: Date;
};

export type BackfillPlan = {
  candidates: BackfillCandidate[];
  skipped: { splitId: string; reason: BackfillSkipReason }[];
};

/**
 * Which legacy settled splits need a synthetic payment.
 *
 * Skips, in order:
 * - `settledAt` null: not settled, nothing to preserve.
 * - an inactive expense: its split cache is reset by every rebuild, so a
 *   synthetic payment would only become phantom credit.
 * - zero amount: nothing to allocate, and a 0.00 payment is noise.
 * - debtor === creditor: the payer's own share is not a debt (no self-payment).
 * - `settledAmount > 0`: the projection already exists.
 * - a backfill row already exists for that split (its `requestId` is in the
 *   set): the run is idempotent.
 *
 * Order is settlement date then split id, so repeated runs and dry runs print
 * the same plan.
 */
export function planBackfill(
  splits: BackfillSplit[],
  backfilledRequestIds: ReadonlySet<string>,
): BackfillPlan {
  const candidates: BackfillCandidate[] = [];
  const skipped: BackfillPlan['skipped'] = [];

  for (const split of splits) {
    let reason: BackfillSkipReason | null = null;
    if (split.settledAt === null) reason = 'not-settled';
    else if (split.inactiveExpense) reason = 'inactive-expense';
    else if (split.amountCents === 0) reason = 'zero-amount';
    else if (split.debtorId === split.creditorId) reason = 'self-pair';
    else if (split.settledCents !== 0) reason = 'already-projected';
    else if (backfilledRequestIds.has(backfillRequestId(split.id))) reason = 'already-backfilled';

    if (reason !== null) {
      skipped.push({ splitId: split.id, reason });
      continue;
    }

    candidates.push({
      splitId: split.id,
      requestId: backfillRequestId(split.id),
      fromUserId: split.debtorId,
      toUserId: split.creditorId,
      amountCents: split.amountCents,
      currency: split.currency,
      occurredAt: split.settledAt as Date,
    });
  }

  candidates.sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || compareText(a.splitId, b.splitId),
  );
  skipped.sort((a, b) => compareText(a.splitId, b.splitId));

  return { candidates, skipped };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Reconcile guard. A rebuild derives cleared amounts from payments alone, so on
 * a legacy settled split (date set, no projection, no payment) it clears both —
 * and the backfill can no longer find the split, because its entry query needs
 * `settledAt` and `settledAmount = 0`. Refuse to rebuild while anything is still
 * waiting for the backfill; the planner already knows every skip rule, so this
 * cannot fire on a correctly backfilled database.
 */
export function backfillBlockerMessage(
  splits: BackfillSplit[],
  backfilledRequestIds: ReadonlySet<string>,
): string | null {
  const { candidates } = planBackfill(splits, backfilledRequestIds);
  if (candidates.length === 0) return null;
  return `Refusing to rebuild: ${candidates.length} split(s) still need the settlement backfill. Run \`pnpm db:backfill\` first.`;
}

/**
 * Every unordered pair the ledger has rows for — splits (any expense state,
 * because a rebuild also clears the cache of inactive ones) and payments.
 * Self-pairs are dropped: a rebuild no-ops on them.
 */
export function ledgerPairs(
  splits: { debtorId: string; creditorId: string }[],
  settlements: { fromId: string; toId: string }[],
): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();

  const add = (a: string, b: string) => {
    if (a === b) return;
    const key = settlementPairKey(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    out.push([a, b]);
  };

  for (const split of splits) add(split.debtorId, split.creditorId);
  for (const settlement of settlements) add(settlement.fromId, settlement.toId);

  return out;
}

/**
 * `0 <= settledAmount <= amount`, and for a real (non-zero) share
 * `settledAt != null` exactly when it is fully cleared.
 *
 * A zero share is exempt from the date rule: the rebuild stamps an active zero
 * split with `now` but resets an inactive one to null, and neither shape means
 * anything — nobody owes anything either way.
 */
export function splitViolations(split: {
  id: string;
  amountCents: number;
  settledCents: number;
  settledAt: Date | null;
}): string[] {
  const out: string[] = [];

  if (split.settledCents < 0) {
    out.push(`split ${split.id}: settledAmount ${split.settledCents} is negative`);
  }
  if (split.settledCents > split.amountCents) {
    out.push(
      `split ${split.id}: settledAmount ${split.settledCents} exceeds amount ${split.amountCents}`,
    );
  }

  // Once the amount bound is broken, the date comparison would only repeat the
  // same breakage in other words.
  const inBounds = split.settledCents >= 0 && split.settledCents <= split.amountCents;
  if (split.amountCents > 0 && inBounds) {
    if (split.settledAt !== null && split.settledCents !== split.amountCents) {
      out.push(
        `split ${split.id}: settledAt is set but only ${split.settledCents} of ${split.amountCents} is cleared`,
      );
    }
    if (split.settledAt === null && split.settledCents === split.amountCents) {
      out.push(`split ${split.id}: fully cleared but settledAt is null`);
    }
  }

  return out;
}

/**
 * A payment never allocates more than it is worth, and a soft-deleted payment
 * holds no allocations (the rebuild releases them).
 */
export function settlementViolations(settlement: {
  id: string;
  amountCents: number;
  allocatedCents: number;
  deleted: boolean;
  allocationCount: number;
}): string[] {
  const out: string[] = [];

  if (settlement.allocatedCents > settlement.amountCents) {
    out.push(
      `settlement ${settlement.id}: allocations ${settlement.allocatedCents} exceed amount ${settlement.amountCents}`,
    );
  }
  if (settlement.deleted && settlement.allocationCount > 0) {
    out.push(
      `settlement ${settlement.id}: soft-deleted but still holds ${settlement.allocationCount} allocation(s)`,
    );
  }

  return out;
}

export type AllocatedSplit = {
  id: string;
  settledCents: number;
};

export type ReconcileAllocation = {
  settlementId: string;
  splitId: string;
  amountCents: number;
  /** Currency of the payment. */
  settlementCurrency: string;
  /** Currency of the expense the split belongs to. */
  splitCurrency: string;
  /** The allocating payment is soft-deleted; already reported by `settlementViolations`. */
  deleted: boolean;
};

/**
 * The invariant that ties the two projections together: after a rebuild, a
 * split's `settledAmount` is exactly the sum of the active allocations pointing
 * at it, and an allocation never crosses currencies.
 *
 * Allocations of a soft-deleted payment are skipped: the rebuild releases them,
 * `settlementViolations` already reports any that survive, and counting them
 * here would blame the split for the payment's broken state.
 */
export function allocationViolations(
  splits: readonly AllocatedSplit[],
  allocations: readonly ReconcileAllocation[],
): string[] {
  const out: string[] = [];
  const cleared = new Map<string, number>(splits.map((split) => [split.id, 0]));

  for (const allocation of allocations) {
    if (allocation.deleted) continue;

    if (allocation.settlementCurrency !== allocation.splitCurrency) {
      out.push(
        `allocation ${allocation.settlementId} -> ${allocation.splitId}: ${allocation.settlementCurrency} payment against a ${allocation.splitCurrency} split`,
      );
    }

    // An allocation pointing at a split outside the pair is itself a violation,
    // and must not silently vanish from the totals.
    if (!cleared.has(allocation.splitId)) {
      out.push(
        `allocation ${allocation.settlementId} -> ${allocation.splitId}: split is not part of this pair`,
      );
      continue;
    }
    cleared.set(
      allocation.splitId,
      (cleared.get(allocation.splitId) ?? 0) + allocation.amountCents,
    );
  }

  for (const split of splits) {
    const allocated = cleared.get(split.id) ?? 0;
    if (allocated !== split.settledCents) {
      out.push(
        `split ${split.id}: settledAmount ${split.settledCents} does not match allocation total ${allocated}`,
      );
    }
  }

  return out;
}
