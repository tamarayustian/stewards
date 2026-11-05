import type { Prisma } from '@/lib/generated/prisma/client';
import { Prisma as PrismaValue } from '@/lib/generated/prisma/browser';
import { toCents } from '@/lib/settlements';

/**
 * What is left on a split after the cleared amount: `amount - settledAmount`.
 *
 * `settledAmount` is the rebuildable projection written by
 * `rebuildPairAllocations`; a balance is the sum of outstanding shares and never
 * subtracts payments separately, so a partial payment shrinks the share instead
 * of hiding it.
 *
 * Money crosses this boundary as integer minor units. Inputs are `Decimal` (or
 * its string form), never `number` — `Number(x) * 100` drifts on values like
 * `0.10`.
 */
export function outstandingCents(
  amount: Prisma.Decimal | string,
  settledAmount: Prisma.Decimal | string,
): number {
  // A projection bug may leave cleared above the amount; a negative balance is
  // never legitimate, so clamp instead of surfacing a debt in reverse.
  return Math.max(toCents(amount) - toCents(settledAmount), 0);
}

/** `outstandingCents` in major units, for display and Decimal math. */
export function outstandingDecimal(
  amount: Prisma.Decimal | string,
  settledAmount: Prisma.Decimal | string,
): Prisma.Decimal {
  return new PrismaValue.Decimal(outstandingCents(amount, settledAmount)).div(100);
}

/**
 * Whether a split still carries money owed. Zero-amount splits that every
 * expense carries (the payer's own share, and a fully paid debtor share) are
 * not debts; a partially paid share is.
 *
 * This is the predicate to reach for when Prisma cannot compare two columns,
 * and the JS counterpart of the SQL filter
 * `{ settledAt: null, amount: { gt: 0 } }`.
 */
export function hasOutstandingShare(
  amount: Prisma.Decimal | string,
  settledAmount: Prisma.Decimal | string,
): boolean {
  return outstandingCents(amount, settledAmount) > 0;
}

/**
 * A payment can outlive the debt it was recorded against (an expense was edited
 * down or deleted). The unallocated remainder is credit: money the payer has
 * already handed over that no split is waiting for. It is displayed next to a
 * pair, never netted into a balance — `amount - SUM(allocations)` is the only
 * definition, so no credit table is needed.
 */
export type PairCredit = {
  counterpartyId: string;
  currency: string;
  /** true when the viewer holds the credit (they overpaid); false when the counterparty does. */
  inViewersFavor: boolean;
  /** always positive, major units */
  amount: Prisma.Decimal;
};

/** The columns `summarizePairCredits` needs from an active `Settlement`. */
export type CreditSettlement = {
  fromUserId: string;
  toUserId: string;
  currency: string;
  amount: Prisma.Decimal | string;
  allocations: { amount: Prisma.Decimal | string }[];
};

/**
 * Pair credit grouped by `(counterparty, currency, direction)` for one viewer.
 * Soft-deleted settlements must already be excluded by the caller. Zero
 * remainders are dropped, so the result only lists money actually held.
 */
export function summarizePairCredits(
  userId: string,
  settlements: CreditSettlement[],
): PairCredit[] {
  const totals = new Map<
    string,
    { counterpartyId: string; currency: string; inViewersFavor: boolean; cents: number }
  >();

  for (const settlement of settlements) {
    if (settlement.fromUserId === settlement.toUserId) continue;

    const viewerPaid = settlement.fromUserId === userId;
    const viewerReceived = settlement.toUserId === userId;
    if (!viewerPaid && !viewerReceived) continue;

    const allocatedCents = settlement.allocations.reduce(
      (sum, allocation) => sum + toCents(allocation.amount),
      0,
    );
    const remainderCents = Math.max(toCents(settlement.amount) - allocatedCents, 0);
    if (remainderCents === 0) continue;

    const counterpartyId = viewerPaid ? settlement.toUserId : settlement.fromUserId;
    const key = `${counterpartyId}|${settlement.currency}|${viewerPaid}`;
    const existing = totals.get(key);
    if (existing) existing.cents += remainderCents;
    else
      totals.set(key, {
        counterpartyId,
        currency: settlement.currency,
        inViewersFavor: viewerPaid,
        cents: remainderCents,
      });
  }

  return [...totals.values()]
    .sort(
      (a, b) =>
        a.counterpartyId.localeCompare(b.counterpartyId) ||
        a.currency.localeCompare(b.currency) ||
        Number(b.inViewersFavor) - Number(a.inViewersFavor),
    )
    .map(({ counterpartyId, currency, inViewersFavor, cents }) => ({
      counterpartyId,
      currency,
      inViewersFavor,
      amount: new PrismaValue.Decimal(cents).div(100),
    }));
}
