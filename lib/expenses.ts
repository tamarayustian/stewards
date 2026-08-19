import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

export type BalanceSummary = {
  youOwe: Prisma.Decimal;
  youAreOwed: Prisma.Decimal;
  unsettledCount: number;
  owedCount: number;
};

export async function getBalances(userId: string): Promise<BalanceSummary> {
  const viewer = await db.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const viewerCurrency = (viewer?.currency ?? 'HKD') as string;

  const activeExpenseWhere = {
    deletedAt: null,
    OR: [{ groupId: null }, { group: { deletedAt: null } }],
  };

  const [oweSplits, owedSplits, unsettledCount] = await Promise.all([
    db.expenseSplit.findMany({
      where: {
        userId,
        settledAt: null,
        expense: { ...activeExpenseWhere, paidById: { not: userId } },
      },
      select: {
        amount: true,
        expense: { select: { currency: true, rate: true } },
      },
    }),
    db.expenseSplit.findMany({
      where: {
        settledAt: null,
        userId: { not: userId },
        expense: { ...activeExpenseWhere, paidById: userId },
      },
      select: {
        amount: true,
        expense: { select: { currency: true, rate: true } },
      },
    }),
    db.expenseSplit.count({
      where: {
        userId,
        settledAt: null,
        amount: { gt: 0 },
        expense: { ...activeExpenseWhere, paidById: { not: userId } },
      },
    }),
  ]);

  function toHome(
    splitAmount: Prisma.Decimal,
    expenseCurrency: string,
    rate: string | null,
  ): Prisma.Decimal {
    if (expenseCurrency === viewerCurrency) return splitAmount;
    return splitAmount.mul(Number(rate ?? '1'));
  }

  const youOwe = oweSplits.reduce(
    (sum, s) => sum.plus(toHome(s.amount, s.expense.currency, s.expense.rate)),
    new Prisma.Decimal(0),
  );
  const youAreOwed = owedSplits.reduce(
    (sum, s) => sum.plus(toHome(s.amount, s.expense.currency, s.expense.rate)),
    new Prisma.Decimal(0),
  );

  const owedRows = await db.expenseSplit.findMany({
    where: {
      settledAt: null,
      userId: { not: userId },
      expense: { ...activeExpenseWhere, paidById: userId },
      amount: { gt: 0 },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  return { youOwe, youAreOwed, unsettledCount, owedCount: owedRows.length };
}

export type ActivityItem = {
  id: string;
  amount: Prisma.Decimal;
  currency: string;
  note: string | null;
  context: string;
  paidByName: string;
  createdAt: Date;
  isPayer: boolean;
  unsettled: boolean;
  hasSettled: boolean;
  myShare: Prisma.Decimal;
  participantCount: number;
};

export type ActivityFilter = 'all' | 'owe' | 'owed' | 'paid';

// Recent expenses where the user paid or was split — group and direct combined.
export async function getActivity(
  userId: string,
  filter: ActivityFilter = 'all',
  take = 20,
  groupId?: string,
): Promise<ActivityItem[]> {
  const baseAnd: Prisma.ExpenseWhereInput[] = [
    { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
    { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
  ];
  if (groupId) {
    baseAnd.push({ groupId });
  }
  let filterClause: Prisma.ExpenseWhereInput | null = null;
  switch (filter) {
    case 'owe':
      filterClause = {
        paidById: { not: userId },
        splits: { some: { userId, settledAt: null, amount: { gt: 0 } } },
      };
      break;
    case 'owed':
      filterClause = {
        paidById: userId,
        splits: { some: { settledAt: null, amount: { gt: 0 }, userId: { not: userId } } },
      };
      break;
    case 'paid':
      filterClause = {
        OR: [
          { paidById: { not: userId }, splits: { some: { userId, settledAt: { not: null } } } },
          { paidById: userId, splits: { none: { settledAt: null, amount: { gt: 0 } } } },
        ],
      };
      break;
  }
  const expenses = await db.expense.findMany({
    where: { deletedAt: null, AND: filterClause ? [...baseAnd, filterClause] : baseAnd },
    include: {
      paidBy: { select: { name: true } },
      group: { select: { name: true } },
      splits: {
        where: { userId },
        select: { settledAt: true, amount: true },
      },
      _count: { select: { splits: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return expenses.map((e) => {
    const mySplit = e.splits[0];
    const unsettled = !mySplit?.settledAt;
    return {
      id: e.id,
      amount: e.amount,
      currency: e.currency,
      note: e.note,
      context: e.group?.name ?? 'Direct',
      paidByName: e.paidBy.name,
      createdAt: e.createdAt,
      isPayer: e.paidById === userId,
      unsettled,
      hasSettled: mySplit !== undefined,
      myShare: mySplit?.amount ?? new Prisma.Decimal(0),
      participantCount: e._count.splits,
    };
  });
}

export type GroupSummary = {
  id: string;
  name: string;
  memberCount: number;
  unsettledCount: number;
  members: { id: string; name: string }[];
};

export async function listGroups(userId: string): Promise<GroupSummary[]> {
  const memberships = await db.groupMember.findMany({
    where: { userId, group: { deletedAt: null } },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { members: true } },
          expenses: {
            where: {
              deletedAt: null,
              splits: { some: { settledAt: null } },
            },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    memberCount: m.group._count.members,
    unsettledCount: m.group.expenses.length,
    members: m.group.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
    })),
  }));
}

export type GroupInviteSummary = {
  id: string;
  email: string;
  status: string;
  inviterName: string;
  createdAt: Date;
};

export type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  members: { id: string; name: string }[];
  invites: GroupInviteSummary[];
  unsettledCount: number;
};

export async function getGroup(groupId: string, userId: string): Promise<GroupDetail | null> {
  const group = await db.group.findFirst({
    where: { id: groupId, deletedAt: null, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      invites: { include: { inviter: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      expenses: {
        where: { deletedAt: null, splits: { some: { settledAt: null } } },
        select: { id: true },
      },
    },
  });
  if (!group) return null;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    members: group.members.map((m) => ({ id: m.user.id, name: m.user.name })),
    invites: group.invites.map((i) => ({
      id: i.id,
      email: i.email,
      status: i.status,
      inviterName: i.inviter.name,
      createdAt: i.createdAt,
    })),
    unsettledCount: group.expenses.length,
  };
}

export async function listUsersForDirect(userId: string) {
  const rows = await db.contact.findMany({
    where: { ownerId: userId, contact: { deletedAt: null } },
    include: { contact: { select: { id: true, name: true } } },
    orderBy: { contact: { name: 'asc' } },
  });
  return rows.map((r) => ({ id: r.contact.id, name: r.contact.name }));
}

export type ContactSummary = {
  id: string;
  name: string;
  email: string | null;
  isRegistered: boolean;
};

export async function listContacts(userId: string): Promise<ContactSummary[]> {
  const rows = await db.contact.findMany({
    where: { ownerId: userId, contact: { deletedAt: null } },
    include: { contact: { select: { id: true, name: true, email: true, isRegistered: true } } },
    orderBy: { contact: { name: 'asc' } },
  });
  return rows.map((r) => ({
    id: r.contact.id,
    name: r.contact.name,
    email: r.contact.email,
    isRegistered: r.contact.isRegistered,
  }));
}
