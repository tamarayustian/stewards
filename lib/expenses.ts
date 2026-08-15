import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

export type BalanceSummary = {
  youOwe: Prisma.Decimal;
  youAreOwed: Prisma.Decimal;
  unsettledCount: number;
};

// Aggregate unsettled splits across both group and direct expenses.
// youOwe  = my share on expenses other people paid (I repay the payer).
// youAreOwed = other people's shares on expenses I paid (they repay me).
export async function getBalances(userId: string): Promise<BalanceSummary> {
  const oweWhere = {
    userId,
    settledAt: null,
    expense: {
      deletedAt: null,
      paidById: { not: userId },
      OR: [{ groupId: null }, { group: { deletedAt: null } }],
    },
  } satisfies Prisma.ExpenseSplitWhereInput;

  const [oweAgg, owedAgg, unsettledCount] = await Promise.all([
    db.expenseSplit.aggregate({
      where: oweWhere,
      _sum: { amount: true },
    }),
    db.expenseSplit.aggregate({
      where: {
        settledAt: null,
        userId: { not: userId },
        expense: {
          deletedAt: null,
          paidById: userId,
          OR: [{ groupId: null }, { group: { deletedAt: null } }],
        },
      },
      _sum: { amount: true },
    }),
    db.expenseSplit.count({ where: { ...oweWhere, amount: { gt: 0 } } }),
  ]);

  return {
    youOwe: oweAgg._sum.amount ?? new Prisma.Decimal(0),
    youAreOwed: owedAgg._sum.amount ?? new Prisma.Decimal(0),
    unsettledCount,
  };
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
): Promise<ActivityItem[]> {
  const baseAnd = [
    { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
    { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
  ];
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
