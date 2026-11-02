import {
  buildPairDetail,
  computePairSummaries,
  type Counterparty,
  type PairDetail,
  type PairSummary,
  type ShareRow,
} from '@/lib/balance-math';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

const activeExpenseWhere = {
  deletedAt: null,
  OR: [{ groupId: null }, { group: { deletedAt: null } }],
} satisfies Prisma.ExpenseWhereInput;

const owedToMeSelect = {
  id: true,
  amount: true,
  userId: true,
  expense: {
    select: {
      id: true,
      createdAt: true,
      note: true,
      amount: true,
      currency: true,
      rate: true,
    },
  },
  user: { select: { name: true, phone: true, isRegistered: true } },
} satisfies Prisma.ExpenseSplitSelect;

const iOweSelect = {
  id: true,
  amount: true,
  expense: {
    select: {
      id: true,
      createdAt: true,
      note: true,
      amount: true,
      currency: true,
      rate: true,
      paidById: true,
      paidBy: { select: { name: true, phone: true, isRegistered: true } },
    },
  },
} satisfies Prisma.ExpenseSplitSelect;

type OwedToMeSplit = Prisma.ExpenseSplitGetPayload<{ select: typeof owedToMeSelect }>;
type IOweSplit = Prisma.ExpenseSplitGetPayload<{ select: typeof iOweSelect }>;
type ReminderWithSender = Prisma.ReminderGetPayload<{
  include: { from: { select: { name: true } } };
}>;

function toOwedToMeRow(split: OwedToMeSplit, viewerCurrency: Currency): ShareRow {
  const rate = split.expense.currency === viewerCurrency ? 1 : Number(split.expense.rate ?? '1');
  return {
    splitId: split.id,
    expenseId: split.expense.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    convertedAmount: split.amount.mul(rate),
    party: {
      id: split.userId,
      name: split.user.name,
      phone: split.user.phone,
      isRegistered: split.user.isRegistered,
    },
  };
}

function toIOweRow(split: IOweSplit, viewerCurrency: Currency): ShareRow {
  const rate = split.expense.currency === viewerCurrency ? 1 : Number(split.expense.rate ?? '1');
  return {
    splitId: split.id,
    expenseId: split.expense.id,
    date: split.expense.createdAt,
    note: split.expense.note,
    amount: split.expense.amount,
    currency: split.expense.currency,
    splitAmount: split.amount,
    convertedAmount: split.amount.mul(rate),
    party: {
      id: split.expense.paidById,
      name: split.expense.paidBy.name,
      phone: split.expense.paidBy.phone,
      isRegistered: split.expense.paidBy.isRegistered,
    },
  };
}

interface PairRows {
  viewerCurrency: Currency;
  owedToMeRows: ShareRow[];
  iOweRows: ShareRow[];
}

// Three queries in one round trip: the viewer's home currency plus every
// unsettled split in both directions.
async function loadPairRows(userId: string): Promise<PairRows> {
  const [viewer, owedToMe, iOwe] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId: { not: userId },
        expense: { ...activeExpenseWhere, paidById: userId },
      },
      select: owedToMeSelect,
    }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId,
        expense: { ...activeExpenseWhere, paidById: { not: userId } },
      },
      select: iOweSelect,
    }),
  ]);

  const viewerCurrency = (viewer?.currency ?? 'HKD') as Currency;
  return {
    viewerCurrency,
    owedToMeRows: owedToMe.map((split) => toOwedToMeRow(split, viewerCurrency)),
    iOweRows: iOwe.map((split) => toIOweRow(split, viewerCurrency)),
  };
}

function summarize(owedToMeRows: ShareRow[], iOweRows: ShareRow[]): PairSummary[] {
  return computePairSummaries(owedToMeRows, iOweRows)
    .filter((pair) => !pair.net.isZero())
    .sort((a, b) => Math.abs(b.net.toNumber()) - Math.abs(a.net.toNumber()));
}

export async function getPairBalances(userId: string): Promise<PairSummary[]> {
  const { owedToMeRows, iOweRows } = await loadPairRows(userId);
  return summarize(owedToMeRows, iOweRows);
}

function remindersFor(userId: string) {
  return db.reminder.findMany({
    where: { toId: userId },
    orderBy: { createdAt: 'desc' },
    include: { from: { select: { name: true } } },
  });
}

function groupByParty(rows: ShareRow[]): Map<string, ShareRow[]> {
  const byParty = new Map<string, ShareRow[]>();
  for (const row of rows) {
    const existing = byParty.get(row.party.id);
    if (existing) existing.push(row);
    else byParty.set(row.party.id, [row]);
  }
  return byParty;
}

function buildReminderRows(reminders: ReminderWithSender[], pairs: PairSummary[]): ReminderRow[] {
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

export interface PairOverview {
  pairs: PairSummary[];
  details: Map<string, PairDetail>;
  reminders: ReminderRow[];
  viewerCurrency: Currency;
}

// Everything the "By Person" list needs: balances, per-pair detail for the
// WhatsApp draft, and reminders — four queries in a single round trip.
// Pair detail comes from the rows already loaded, so there is no per-person N+1.
export async function getPairOverview(userId: string): Promise<PairOverview> {
  const [{ viewerCurrency, owedToMeRows, iOweRows }, reminderRows] = await Promise.all([
    loadPairRows(userId),
    remindersFor(userId),
  ]);

  const pairs = summarize(owedToMeRows, iOweRows);
  const owedByParty = groupByParty(owedToMeRows);
  const iOweByParty = groupByParty(iOweRows);

  const details = new Map<string, PairDetail>();
  for (const pair of pairs) {
    const partyId = pair.counterparty.id;
    details.set(
      partyId,
      buildPairDetail(
        pair.counterparty,
        owedByParty.get(partyId) ?? [],
        iOweByParty.get(partyId) ?? [],
      ),
    );
  }

  return {
    pairs,
    details,
    reminders: buildReminderRows(reminderRows, pairs),
    viewerCurrency,
  };
}

export async function getPairDetail(
  userId: string,
  otherUserId: string,
): Promise<PairDetail | null> {
  // All four reads are independent — keep them in one round trip instead of
  // serialising the viewer-currency lookup in front of the split queries.
  const [viewer, owedToMe, iOwe, counterpartyRow] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId: otherUserId,
        expense: { ...activeExpenseWhere, paidById: userId },
      },
      select: {
        id: true,
        amount: true,
        expense: {
          select: {
            id: true,
            createdAt: true,
            note: true,
            amount: true,
            currency: true,
            rate: true,
          },
        },
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
        expense: {
          select: {
            id: true,
            createdAt: true,
            note: true,
            amount: true,
            currency: true,
            rate: true,
          },
        },
      },
    }),
    db.user.findFirst({
      where: { id: otherUserId, deletedAt: null },
      select: { name: true, phone: true, isRegistered: true },
    }),
  ]);

  const viewerCurrency = (viewer?.currency ?? 'HKD') as Currency;

  if (!counterpartyRow) return null;
  if (owedToMe.length === 0 && iOwe.length === 0) return null;

  const counterparty: Counterparty = { id: otherUserId, ...counterpartyRow };

  const owedToMeRows: ShareRow[] = owedToMe.map((split) => {
    const sameCurrency = split.expense.currency === viewerCurrency;
    const rate = sameCurrency ? 1 : Number(split.expense.rate ?? '1');
    return {
      splitId: split.id,
      expenseId: split.expense.id,
      date: split.expense.createdAt,
      note: split.expense.note,
      amount: split.expense.amount,
      currency: split.expense.currency,
      splitAmount: split.amount,
      convertedAmount: split.amount.mul(rate),
      party: counterparty,
    };
  });

  const iOweRows: ShareRow[] = iOwe.map((split) => {
    const sameCurrency = split.expense.currency === viewerCurrency;
    const rate = sameCurrency ? 1 : Number(split.expense.rate ?? '1');
    return {
      splitId: split.id,
      expenseId: split.expense.id,
      date: split.expense.createdAt,
      note: split.expense.note,
      amount: split.expense.amount,
      currency: split.expense.currency,
      splitAmount: split.amount,
      convertedAmount: split.amount.mul(rate),
      party: counterparty,
    };
  });

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
  // One query: unread reminders from a sender who still has an active expense
  // where the viewer owes a non-zero, unsettled share.
  return db.reminder.count({
    where: {
      toId: userId,
      readAt: null,
      from: {
        paidExpenses: {
          some: {
            ...activeExpenseWhere,
            splits: { some: { userId, settledAt: null, amount: { gt: 0 } } },
          },
        },
      },
    },
  });
}

export async function listReminders(userId: string): Promise<ReminderRow[]> {
  const [{ owedToMeRows, iOweRows }, reminders] = await Promise.all([
    loadPairRows(userId),
    remindersFor(userId),
  ]);
  return buildReminderRows(reminders, summarize(owedToMeRows, iOweRows));
}
