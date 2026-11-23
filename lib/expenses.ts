import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { toViewerCurrency } from '@/lib/currency-convert';
import { summarizeGroupBalances, type GroupBalances } from '@/lib/group-balances';
import { hasOutstandingShare, outstandingDecimal } from '@/lib/outstanding';
import { buildActivityWhere, type ActivityFilter } from '@/lib/expense-search';

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
        toViewerCurrency(
          outstandingDecimal(split.amount, split.settledAmount),
          split.expense.currency,
          split.expense.rate,
          viewerCurrency,
        ),
      ),
    new Prisma.Decimal(0),
  );
  const youAreOwed = owedRows.reduce(
    (sum, split) =>
      sum.plus(
        toViewerCurrency(
          outstandingDecimal(split.amount, split.settledAmount),
          split.expense.currency,
          split.expense.rate,
          viewerCurrency,
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
  /** The calendar day the expense happened; falls back to `createdAt` for legacy rows. */
  occurredAt: Date;
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

export type { ActivityFilter } from '@/lib/expense-search';

const activityInclude = {
  paidBy: { select: { name: true } },
  group: { select: { name: true } },
  splits: { select: { settledAmount: true, amount: true, userId: true } },
  _count: { select: { splits: true } },
} satisfies Prisma.ExpenseInclude;

const activityOrderBy = [
  { occurredAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
] satisfies Prisma.ExpenseOrderByWithRelationInput[];

type ActivityRow = Prisma.ExpenseGetPayload<{ include: typeof activityInclude }>;

function mapActivityItem(e: ActivityRow, userId: string): ActivityItem {
  const mySplit = e.splits.find((s) => s.userId === userId);
  const myShare = mySplit
    ? outstandingDecimal(mySplit.amount, mySplit.settledAmount)
    : new Prisma.Decimal(0);
  const isPayer = e.paidById === userId;
  const unsettledBorrowers = e.splits.filter(
    (s) => s.userId !== userId && hasOutstandingShare(s.amount, s.settledAmount),
  );
  const hasSettled = isPayer
    ? e.splits.some((s) => s.userId !== userId && s.settledAmount.gt(0))
    : mySplit !== undefined;
  const unsettled = isPayer ? unsettledBorrowers.length > 0 : myShare.gt(0);
  const borrowerId = unsettledBorrowers.length === 1 ? unsettledBorrowers[0].userId : null;

  return {
    id: e.id,
    amount: e.amount,
    currency: e.currency,
    note: e.note,
    context: e.group?.name ?? 'Direct',
    paidByName: e.paidBy.name,
    occurredAt: e.occurredAt ?? e.createdAt,
    createdAt: e.createdAt,
    isPayer,
    unsettled,
    hasSettled,
    myShare,
    shareAmount: mySplit ? mySplit.amount : new Prisma.Decimal(0),
    participantCount: e._count.splits,
    borrowerId,
  };
}

export async function getActivity(
  userId: string,
  filter: ActivityFilter = 'all',
  take = 20,
  groupId?: string,
): Promise<ActivityItem[]> {
  const expenses = await db.expense.findMany({
    where: buildActivityWhere(userId, filter, groupId ? { group: groupId } : {}),
    include: activityInclude,
    orderBy: activityOrderBy,
    take,
  });

  return expenses.map((expense) => mapActivityItem(expense, userId));
}

export type ActivityCounts = Record<ActivityFilter, number>;

export type ActivityPage = {
  items: ActivityItem[];
  counts: ActivityCounts;
  total: number;
  group: string;
  groups: { id: string; name: string }[];
};

export async function listGroupOptions(
  userId: string,
): Promise<{ id: string; name: string }[]> {
  return db.group.findMany({
    where: { deletedAt: null, members: { some: { userId } } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function getActivityPage(
  userId: string,
  options: { q?: string; group?: string; filter?: ActivityFilter; take?: number } = {},
): Promise<ActivityPage> {
  const { q = '', group = 'all', filter = 'all', take = 50 } = options;
  const groups = await listGroupOptions(userId);
  const resolvedGroup =
    group === 'all' || group === 'direct'
      ? group
      : groups.some((option) => option.id === group)
        ? group
        : 'all';
  const filters: ActivityFilter[] = ['all', 'owe', 'owed', 'paid'];
  const [expenses, counts] = await Promise.all([
    db.expense.findMany({
      where: buildActivityWhere(userId, filter, { q, group: resolvedGroup }),
      include: activityInclude,
      orderBy: activityOrderBy,
      take,
    }),
    Promise.all(
      filters.map((status) =>
        db.expense.count({
          where: buildActivityWhere(userId, status, { q, group: resolvedGroup }),
        }),
      ),
    ),
  ]);
  const countsByFilter = Object.fromEntries(
    filters.map((status, index) => [status, counts[index]]),
  ) as ActivityCounts;

  return {
    items: expenses.map((expense) => mapActivityItem(expense, userId)),
    counts: countsByFilter,
    total: countsByFilter[filter],
    group: resolvedGroup,
    groups,
  };
}

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

/**
 * Whether an expense still has a borrower on the hook. Callers pass only open,
 * non-zero splits: the payer's own split is never a debt, even when legacy data
 * gave it an amount, and the rebuild can never settle it. Counting it would make
 * `deleteGroup` refuse a group the user cannot fix.
 */
function hasUnsettledBorrower(expense: {
  paidById: string;
  splits: { userId: string }[];
}): boolean {
  return expense.splits.some((split) => split.userId !== expense.paidById);
}

// Open, non-zero shares only; `hasUnsettledBorrower` then drops self-splits.
const openShareSelect = {
  where: { settledAt: null, amount: { gt: 0 } },
  select: { userId: true },
} satisfies Prisma.ExpenseSplitFindManyArgs;

/** Unsettled expenses per group, computed in memory because Prisma cannot compare
 * `split.userId` with the parent `expense.paidById`. */
function unsettledCount(expenses: { paidById: string; splits: { userId: string }[] }[]): number {
  return expenses.filter(hasUnsettledBorrower).length;
}

export async function listGroups(userId: string): Promise<GroupSummary[]> {
  const memberships = await db.groupMember.findMany({
    where: { userId, group: { deletedAt: null } },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          expenses: {
            where: { deletedAt: null },
            select: { paidById: true, splits: openShareSelect },
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
    unsettledCount: unsettledCount(m.group.expenses),
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
  viewerCurrency: string;
  balances: GroupBalances;
};

export async function getGroup(groupId: string, userId: string): Promise<GroupDetail | null> {
  const [group, viewer] = await Promise.all([
    db.group.findFirst({
      where: { id: groupId, deletedAt: null, members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        invites: {
          include: { inviter: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        expenses: {
          where: { deletedAt: null },
          select: {
            amount: true,
            currency: true,
            rate: true,
            paidById: true,
            splits: {
              where: { settledAt: null, amount: { gt: 0 } },
              select: { userId: true, amount: true, settledAmount: true },
            },
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: userId }, select: { currency: true } }),
  ]);
  if (!group) return null;

  const viewerCurrency = viewer?.currency ?? 'HKD';

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
    unsettledCount: unsettledCount(group.expenses),
    viewerCurrency,
    balances: summarizeGroupBalances(group.expenses, userId, viewerCurrency),
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
