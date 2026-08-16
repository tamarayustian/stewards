import {
  buildPairDetail,
  computePairSummaries,
  type Counterparty,
  type PairDetail,
  type PairSummary,
  type ShareRow,
} from '@/lib/balance-math';
import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

const activeExpenseWhere = {
  deletedAt: null,
  OR: [{ groupId: null }, { group: { deletedAt: null } }],
} satisfies Prisma.ExpenseWhereInput;

export async function getPairBalances(userId: string): Promise<PairSummary[]> {
  const [owedToMe, iOwe] = await Promise.all([
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId: { not: userId },
        expense: { ...activeExpenseWhere, paidById: userId },
      },
      select: {
        id: true,
        amount: true,
        userId: true,
        expense: { select: { createdAt: true, note: true, amount: true, currency: true } },
        user: { select: { name: true, phone: true, isRegistered: true } },
      },
    }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId,
        expense: { ...activeExpenseWhere, paidById: { not: userId } },
      },
      select: {
        id: true,
        amount: true,
        expense: {
          select: {
            createdAt: true,
            note: true,
            amount: true,
            currency: true,
            paidById: true,
            paidBy: { select: { name: true, phone: true, isRegistered: true } },
          },
        },
      },
    }),
  ]);

  const owedToMeRows: ShareRow[] = owedToMe.map((split) => ({
    splitId: split.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    party: {
      id: split.userId,
      name: split.user.name,
      phone: split.user.phone,
      isRegistered: split.user.isRegistered,
    },
  }));

  const iOweRows: ShareRow[] = iOwe.map((split) => ({
    splitId: split.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    party: {
      id: split.expense.paidById,
      name: split.expense.paidBy.name,
      phone: split.expense.paidBy.phone,
      isRegistered: split.expense.paidBy.isRegistered,
    },
  }));

  return computePairSummaries(owedToMeRows, iOweRows)
    .filter((pair) => !pair.net.isZero())
    .sort((a, b) => Math.abs(b.net.toNumber()) - Math.abs(a.net.toNumber()));
}

export async function getPairDetail(
  userId: string,
  otherUserId: string,
): Promise<PairDetail | null> {
  const [owedToMe, iOwe, counterpartyRow] = await Promise.all([
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId: otherUserId,
        expense: { ...activeExpenseWhere, paidById: userId },
      },
      select: {
        id: true,
        amount: true,
        expense: { select: { createdAt: true, note: true, amount: true, currency: true } },
      },
    }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId,
        expense: { ...activeExpenseWhere, paidById: otherUserId },
      },
      select: {
        id: true,
        amount: true,
        expense: { select: { createdAt: true, note: true, amount: true, currency: true } },
      },
    }),
    db.user.findFirst({
      where: { id: otherUserId, deletedAt: null },
      select: { name: true, phone: true, isRegistered: true },
    }),
  ]);

  if (!counterpartyRow) return null;
  if (owedToMe.length === 0 && iOwe.length === 0) return null;

  const counterparty: Counterparty = { id: otherUserId, ...counterpartyRow };

  const owedToMeRows: ShareRow[] = owedToMe.map((split) => ({
    splitId: split.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    party: counterparty,
  }));

  const iOweRows: ShareRow[] = iOwe.map((split) => ({
    splitId: split.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    party: counterparty,
  }));

  return buildPairDetail(counterparty, owedToMeRows, iOweRows);
}

export interface ReminderRow {
  id: string;
  fromId: string;
  fromName: string;
  createdAt: Date;
  readAt: Date | null;
  amountOwed: Prisma.Decimal;
  iOweCount: number;
}

export async function countUnreadReminders(userId: string): Promise<number> {
  return db.reminder.count({ where: { toId: userId, readAt: null } });
}

export async function listReminders(userId: string): Promise<ReminderRow[]> {
  const [reminders, pairs] = await Promise.all([
    db.reminder.findMany({
      where: { toId: userId },
      orderBy: { createdAt: 'desc' },
      include: { from: { select: { name: true } } },
    }),
    getPairBalances(userId),
  ]);

  const pairByFrom = new Map(pairs.map((p) => [p.counterparty.id, p]));

  return reminders.flatMap((reminder) => {
    const pair = pairByFrom.get(reminder.fromId);
    if (!pair || pair.amountIOwe.isZero()) return [];
    return [
      {
        id: reminder.id,
        fromId: reminder.fromId,
        fromName: reminder.from.name,
        createdAt: reminder.createdAt,
        readAt: reminder.readAt,
        amountOwed: pair.amountIOwe,
        iOweCount: pair.iOweCount,
      },
    ];
  });
}
