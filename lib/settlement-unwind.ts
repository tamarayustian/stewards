/**
 * Settlement unwind planning.
 *
 * `unsettleExpense` reverses a share by soft-deleting the payments that funded
 * it. A payment can fund several shares across several expenses, so the scope of
 * that reversal must be known before it happens: this module decides which
 * payments to close and reports everything else they were covering.
 *
 * Pure and client-safe: no Prisma import, integer minor units only.
 */

export type UnwindAllocation = {
  settlementId: string;
  splitId: string;
};

export type UnwindSettlement = {
  id: string;
  amountCents: number;
};

export type SettlementUnwindPlan = {
  /** Active settlements to soft-delete, sorted for deterministic output. */
  settlementIds: string[];
  settlementsClosed: number;
  /** Allocations on the tapped split released by closing those settlements. */
  allocationsReleased: number;
  /**
   * Distinct other splits (not allocations) those settlements were funding. A
   * split can be funded by several closed payments and is counted once.
   */
  otherSplitsReleased: number;
  /** Sum of the closed settlements' amounts. */
  amountReversedCents: number;
};

/**
 * Given the tapped split, every allocation belonging to the candidate
 * settlements, and the candidate settlements themselves, decide what the unwind
 * actually reverses.
 *
 * A settlement is closed when it funds the tapped split. Allocations pointing at
 * settlements outside `settlements` are ignored: their payment is already gone,
 * so it must not drive a second soft delete.
 *
 * The summary counts *released* work, not *reopened* work: whether another split
 * stays settled depends on the rebuild, which this pure helper cannot see. The
 * tapped split's outcome is verified by the caller after the rebuild.
 */
export function planSettlementUnwind(input: {
  splitId: string;
  allocations: readonly UnwindAllocation[];
  settlements: readonly UnwindSettlement[];
}): SettlementUnwindPlan {
  const candidates = new Map(input.settlements.map((row) => [row.id, row]));

  const toClose = new Set<string>();
  for (const allocation of input.allocations) {
    if (allocation.splitId !== input.splitId) continue;
    if (candidates.has(allocation.settlementId)) toClose.add(allocation.settlementId);
  }

  let allocationsReleased = 0;
  const otherSplitIds = new Set<string>();
  for (const allocation of input.allocations) {
    if (!toClose.has(allocation.settlementId)) continue;
    if (allocation.splitId === input.splitId) allocationsReleased += 1;
    else otherSplitIds.add(allocation.splitId);
  }

  const settlementIds = [...toClose].sort();
  const amountReversedCents = settlementIds.reduce(
    (sum, id) => sum + (candidates.get(id)?.amountCents ?? 0),
    0,
  );

  return {
    settlementIds,
    settlementsClosed: settlementIds.length,
    allocationsReleased,
    otherSplitsReleased: otherSplitIds.size,
    amountReversedCents,
  };
}
