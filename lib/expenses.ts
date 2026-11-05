import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { hasOutstandingShare, outstandingDecimal } from '@/lib/outstanding';

export type BalanceSummary = {
  youOwe: Prisma.Decimal;
  youAreOwed: Prisma.Decimal;
  unsettledCount: number;
  owedCount: number;
};

export async function getBalances(userId: string): Promise<BalanceSummary> {
  const activeExpenseWhere = {
    deletedAt: null,
    OR: [{ groupId: null }, { group: { deletedAt: null } }],
  };

  // The viewer's currency is only needed for the in-memory conversion below, so
  // every read can go out in one batch instead of waiting on the user lookup.
  const [viewer, oweSplits, owedSplits] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    db.expenseSplit.findMany({
      where: {
        userId,
        settledAt: null,
        expense: { ...activeExpenseWhere, paidById: { not: userId } },
      },
      select: {
        amount: true,
        settledAmount: true,
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
        userId: true,
        amount: true,
        settledAmount: true,
        expense: { select: { currency: true, rate: true } },
      },
    }),
  ]);

  const viewerCurrency = (viewer?.currency ?? 'HKD') as string;

  function toHome(
    splitAmount: Prisma.Decimal,
    expenseCurrency: string,
    rate: string | null,
  ): Prisma.Decimal {
    if (expenseCurrency === viewerCurrency) return splitAmount;
    return splitAmount.mul(Number(rate ?? '1'));
  }

  // `settledAt: null` says "not fully settled"; the amount still owed is
  // `amount - settledAmount`. Prisma cannot compare two columns, so zero-share
  // rows (a payer's own zero split, or one the rebuild has just closed) are
  // dropped here rather than counted as debt.
  const owingRows = oweSplits.filter((split) =>
    hasOutstandingShare(split.amount, split.settledAmount),
  );
  const owedRows = owedSplits.filter((split) =>
    hasOutstandingShare(split.amount, split.settledAmount),
  );

  const youOwe = owingRows.reduce(
    (sum, split) =>
      sum.plus(
        toHome(
          outstandingDecimal(split.amount, split.settledAmount),
          split.expense.currency,
          split.expense.rate,
        ),
      ),
    new Prisma.Decimal(0),
  );
  const youAreOwed = owedRows.reduce(
    (sum, split) =>
      sum.plus(
        toHome(
          outstandingDecimal(split.amount, split.settledAmount),
          split.expense.currency,
          split.expense.rate,
        ),
      ),
    new Prisma.Decimal(0),
  );

  return {
    youOwe,
    youAreOwed,
    unsettledCount: owingRows.length,
    owedCount: new Set(owedRows.map((split) => split.userId)).size,
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
  /** What is still owed on the viewer's share. */
  myShare: Prisma.Decimal;
  /** The viewer's original split amount, for settled history rows. */
  shareAmount: Prisma.Decimal;
  participantCount: number;
  borrowerId: string | null;
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
        select: { settledAmount: true, amount: true, userId: true },
      },
      _count: { select: { splits: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return expenses.map((e) => {
    const mySplit = e.splits.find((s) => s.userId === userId);
    // `myShare` is what is still owed on the viewer's own share; a partially
    // paid share stays visible with its reduced amount.
    const myShare = mySplit
      ? outstandingDecimal(mySplit.amount, mySplit.settledAmount)
      : new Prisma.Decimal(0);
    const isPayer = e.paidById === userId;
    // Zero-share splits never count: fully settled borrowers drop out here, and
    // the payer's own 0.00 share is ignored on both sides.
    const unsettledBorrowers = e.splits.filter(
      (s) => s.userId !== userId && hasOutstandingShare(s.amount, s.settledAmount),
    );
    const hasSettled = mySplit !== undefined;
    const unsettled = isPayer ? unsettledBorrowers.length > 0 : myShare.gt(0);
    const borrowerId = unsettledBorrowers.length === 1 ? unsettledBorrowers[0].userId : null;
    return {
      id: e.id,
      amount: e.amount,
      currency: e.currency,
      note: e.note,
      context: e.group?.name ?? 'Direct',
      paidByName: e.paidBy.name,
      createdAt: e.createdAt,
      isPayer,
      unsettled,
      hasSettled,
      myShare,
      shareAmount: mySplit ? mySplit.amount : new Prisma.Decimal(0),
      participantCount: e._count.splits,
      borrowerId,
    };
  });
}

// Cheap existence check: filtered dashboard views only need to know whether the
// user has any activity at all, not a second copy of the full feed.
export async function hasAnyActivity(userId: string): Promise<boolean> {
  const count = await db.expense.count({
    where: {
      deletedAt: null,
      AND: [
        { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
        { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
      ],
    },
  });
  return count > 0;
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
          _count: {
            select: {
              // Counted in SQL instead of shipping every matching expense id.
              // `amount: { gt: 0 }` skips the payer's own 0.00 share, which no
              // rebuild ever closes; a part-paid debtor share still counts.
              expenses: {
                where: {
                  deletedAt: null,
                  splits: { some: { settledAt: null, amount: { gt: 0 } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    memberCount: m.group.members.length,
    unsettledCount: m.group._count.expenses,
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
      _count: {
        select: {
          expenses: {
            // Same guard as `listGroups`: the payer's 0.00 split is not a debt.
            where: {
              deletedAt: null,
              splits: { some: { settledAt: null, amount: { gt: 0 } } },
            },
          },
        },
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
    unsettledCount: group._count.expenses,
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
