import { settlementPairKey } from '@/lib/settlements';

/**
 * Which pairs an expense touches.
 *
 * Every mutation that can move a balance has to rebuild the pairs it changed,
 * and the rebuild is pair-scoped — so the caller first needs the set of pairs an
 * expense implies: the payer against each other participant. The payer's own
 * split is not a debt (no self-payment), so it yields no pair.
 *
 * An edit can move the creditor (payer), so the caller passes the expense's old
 * shape *and* its new one: the old pair must be rebuilt too, or it keeps a
 * phantom debt that nothing points at any more.
 *
 * Pure and client-safe: no Prisma import, ids only.
 */

export type ExpensePairSource = {
  paidById: string;
  splits: { userId: string }[];
};

function collect(expense: ExpensePairSource, seen: Set<string>, out: string[][]): void {
  for (const split of expense.splits) {
    if (split.userId === expense.paidById) continue;
    const key = settlementPairKey(expense.paidById, split.userId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([expense.paidById, split.userId]);
  }
}

/** One pair per distinct counterparty, payer first, in split order. */
export function affectedPairsForExpense(expense: ExpensePairSource): string[][] {
  const out: string[][] = [];
  collect(expense, new Set(), out);
  return out;
}

/**
 * Union of several expense shapes (an edit's before and after, or every expense
 * a ghost merge touched), deduped by unordered pair. Order is stable: the first
 * shape that implies a pair decides its position and orientation.
 */
export function affectedPairsForExpenses(expenses: ExpensePairSource[]): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();
  for (const expense of expenses) {
    collect(expense, seen, out);
  }
  return out;
}
