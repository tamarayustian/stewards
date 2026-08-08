import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

export type BalanceSummary = {
  youOwe: Prisma.Decimal;
  youAreOwed: Prisma.Decimal;
};

// Aggregate unsettled splits across both group and direct expenses.
// youOwe  = my share on expenses other people paid (I repay the payer).
// youAreOwed = other people's shares on expenses I paid (they repay me).
export async function getBalances(userId: string): Promise<BalanceSummary> {
  const [oweAgg, owedAgg] = await Promise.all([
    db.expenseSplit.aggregate({
      where: {
        userId,
        settledAt: null,
        expense: {
          deletedAt: null,
          paidById: { not: userId },
          OR: [{ groupId: null }, { group: { deletedAt: null } }],
        },
      },
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
  ]);

  return {
    youOwe: oweAgg._sum.amount ?? new Prisma.Decimal(0),
    youAreOwed: owedAgg._sum.amount ?? new Prisma.Decimal(0),
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
  participantCount: number;
};

// Recent expenses where the user paid or was split — group and direct combined.
export async function getActivity(userId: string, take = 20): Promise<ActivityItem[]> {
  const expenses = await db.expense.findMany({
    where: {
      deletedAt: null,
      AND: [
        { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
        { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
      ],
    },
    include: {
      paidBy: { select: { name: true } },
      group: { select: { name: true } },
      splits: {
        where: { userId },
        select: { settledAt: true },
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
  return db.user.findMany({
    where: { id: { not: userId }, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}
