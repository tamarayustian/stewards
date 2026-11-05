/**
 * Pure settlement allocation engine.
 *
 * Given a pair's outstanding splits and their active payments, decide how much
 * of each split each payment clears, oldest first, and how much of each payment
 * is left as credit.
 *
 * Invariants:
 * - Integer minor units only. No floats, no rounding after arithmetic.
 * - A payment only clears splits with the same debtor (`fromId`), creditor
 *   (`toId`) and currency.
 * - A pinned split is cleared first when eligible; otherwise oldest-first.
 * - Never clears more than a split's outstanding or a payment's remainder.
 * - Excess payment stays credit, summed per currency.
 * - Inputs are never mutated. Same input always yields the same order.
 *
 * This module is pure: no Prisma, no database, no I/O. It is safe to import
 * from a client bundle.
 */

export type AllocationSplit = {
  id: string;
  debtorId: string;
  creditorId: string;
  amountCents: number;
  /**
   * Informational only. A rebuild derives cleared amounts from active payments
   * alone, so this engine deliberately ignores it to avoid double counting.
   */
  settledCents?: number;
  currency: string;
  occurredAt: Date;
  createdAt: Date;
};

export type AllocationPayment = {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  createdAt: Date;
  pinnedSplitId?: string | null;
};

export type AllocationInput = {
  splits: AllocationSplit[];
  payments: AllocationPayment[];
};

export type AllocationResult = {
  allocations: { settlementId: string; splitId: string; amountCents: number }[];
  /** Total cleared per split id (`outstanding` is `amountCents - settledCents`). */
  settledCents: Map<string, number>;
  /** Unapplied remainder per currency, summed across payments. */
  creditCents: Map<string, number>;
};

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const compareByDateThenId = (
  a: { occurredAt: Date; createdAt: Date; id: string },
  b: { occurredAt: Date; createdAt: Date; id: string },
): number =>
  a.occurredAt.getTime() - b.occurredAt.getTime() ||
  a.createdAt.getTime() - b.createdAt.getTime() ||
  compareText(a.id, b.id);

export function allocateSettlements(input: AllocationInput): AllocationResult {
  const splits = [...input.splits].sort(compareByDateThenId);
  const payments = [...input.payments].sort(compareByDateThenId);

  const allocations: AllocationResult['allocations'] = [];
  const settledCents = new Map<string, number>();
  const creditCents = new Map<string, number>();

  for (const split of splits) settledCents.set(split.id, 0);

  for (const payment of payments) {
    let remaining = payment.amountCents;

    const eligible = splits.filter(
      (split) =>
        split.debtorId === payment.fromId &&
        split.creditorId === payment.toId &&
        split.currency === payment.currency &&
        split.amountCents - (settledCents.get(split.id) ?? 0) > 0,
    );

    const allocateTo = (split: AllocationSplit) => {
      if (remaining <= 0) return;
      const outstanding = split.amountCents - (settledCents.get(split.id) ?? 0);
      const amountCents = Math.min(outstanding, remaining);
      if (amountCents <= 0) return;

      allocations.push({ settlementId: payment.id, splitId: split.id, amountCents });
      settledCents.set(split.id, (settledCents.get(split.id) ?? 0) + amountCents);
      remaining -= amountCents;
    };

    if (payment.pinnedSplitId) {
      const pinned = eligible.find((split) => split.id === payment.pinnedSplitId);
      if (pinned) allocateTo(pinned);
    }

    for (const split of eligible) {
      if (remaining <= 0) break;
      if (payment.pinnedSplitId && split.id === payment.pinnedSplitId) continue;
      allocateTo(split);
    }

    if (remaining > 0) {
      creditCents.set(payment.currency, (creditCents.get(payment.currency) ?? 0) + remaining);
    }
  }

  return { allocations, settledCents, creditCents };
}
