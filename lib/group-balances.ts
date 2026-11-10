import { Prisma } from '@/lib/generated/prisma/client';

import { toViewerCurrency } from './currency-convert';

export type GroupExpenseRow = {
  amount: Prisma.Decimal;
  currency: string;
  rate: string | null;
  paidById: string;
  splits: { userId: string; amount: Prisma.Decimal; settledAmount: Prisma.Decimal }[];
};

export type GroupBalances = {
  total: Prisma.Decimal;
  owedToViewer: Prisma.Decimal;
  viewerOwes: Prisma.Decimal;
  memberNets: Map<string, Prisma.Decimal>;
};

const outstanding = (split: { amount: Prisma.Decimal; settledAmount: Prisma.Decimal }) =>
  split.amount.sub(split.settledAmount);

/**
 * Folds a group's open expense rows into the viewer's position and each
 * member's net. Amounts are converted to the viewer's home currency first so a
 * group that mixes currencies still produces one honest total.
 */
export function summarizeGroupBalances(
  expenses: GroupExpenseRow[],
  viewerId: string,
  viewerCurrency: string,
): GroupBalances {
  const zero = () => new Prisma.Decimal(0);
  const memberNets = new Map<string, Prisma.Decimal>();
  const ensure = (userId: string) => {
    let net = memberNets.get(userId);
    if (!net) {
      net = zero();
      memberNets.set(userId, net);
    }
    return net;
  };

  let total = zero();
  let owedToViewer = zero();
  let viewerOwes = zero();

  for (const expense of expenses) {
    total = total.add(
      toViewerCurrency(expense.amount, expense.currency, expense.rate, viewerCurrency),
    );
    ensure(expense.paidById);
    for (const split of expense.splits) ensure(split.userId);

    if (expense.paidById === viewerId) {
      for (const split of expense.splits) {
        if (split.userId === viewerId) continue;
        const open = outstanding(split);
        if (open.lte(0)) continue;

        const converted = toViewerCurrency(
          open,
          expense.currency,
          expense.rate,
          viewerCurrency,
        );
        owedToViewer = owedToViewer.add(converted);
        memberNets.set(split.userId, ensure(split.userId).add(converted));
      }
    } else {
      const mine = expense.splits.find((split) => split.userId === viewerId);
      if (!mine) continue;

      const open = outstanding(mine);
      if (open.lte(0)) continue;

      const converted = toViewerCurrency(open, expense.currency, expense.rate, viewerCurrency);
      viewerOwes = viewerOwes.add(converted);
      memberNets.set(expense.paidById, ensure(expense.paidById).sub(converted));
    }
  }

  return { total, owedToViewer, viewerOwes, memberNets };
}
