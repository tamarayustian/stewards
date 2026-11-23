import type { Prisma } from '@/lib/generated/prisma/client';

export type ActivityFilter = 'all' | 'owe' | 'owed' | 'paid';

type ParamValue = string | string[] | undefined;

const firstValue = (value: ParamValue): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parseExpenseQuery(value?: ParamValue): string {
  return (firstValue(value) ?? '').trim().slice(0, 80);
}

export function parseExpenseGroup(value?: ParamValue): string {
  return firstValue(value)?.trim() || 'all';
}

export function parseActivityFilter(value?: ParamValue): ActivityFilter {
  const first = firstValue(value);
  if (first === 'owe' || first === 'owed' || first === 'paid') return first;
  return 'all';
}

export interface ExpenseSearchPatch {
  q?: string;
  group?: string | null;
  filter?: string | null;
}

export function mergeExpenseSearchParams(
  current: URLSearchParams,
  patch: ExpenseSearchPatch,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (patch.q !== undefined) {
    const q = patch.q.trim();
    if (q) next.set('q', q);
    else next.delete('q');
  }
  if (patch.group !== undefined) {
    if (patch.group) next.set('group', patch.group);
    else next.delete('group');
  }
  if (patch.filter !== undefined) {
    if (patch.filter) next.set('filter', patch.filter);
    else next.delete('filter');
  }

  return next;
}

function statusWhere(userId: string, filter: ActivityFilter): Prisma.ExpenseWhereInput | null {
  switch (filter) {
    case 'owe':
      return {
        paidById: { not: userId },
        splits: { some: { userId, settledAt: null, amount: { gt: 0 } } },
      };
    case 'owed':
      return {
        paidById: userId,
        splits: { some: { settledAt: null, amount: { gt: 0 }, userId: { not: userId } } },
      };
    case 'paid':
      return {
        OR: [
          { paidById: { not: userId }, splits: { some: { userId, settledAt: { not: null } } } },
          { paidById: userId, splits: { none: { settledAt: null, amount: { gt: 0 } } } },
        ],
      };
    default:
      return null;
  }
}

export function buildActivityWhere(
  userId: string,
  filter: ActivityFilter,
  { q, group }: { q?: string; group?: string } = {},
): Prisma.ExpenseWhereInput {
  const and: Prisma.ExpenseWhereInput[] = [
    { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
    { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
  ];

  const resolvedGroup = parseExpenseGroup(group);
  if (resolvedGroup === 'direct') {
    and.push({ groupId: null });
  } else if (resolvedGroup !== 'all') {
    and.push({ group: { id: resolvedGroup, members: { some: { userId } } } });
  }

  const query = parseExpenseQuery(q);
  if (query) {
    and.push({
      OR: [
        { note: { contains: query, mode: 'insensitive' } },
        { paidBy: { name: { contains: query, mode: 'insensitive' } } },
        { splits: { some: { user: { name: { contains: query, mode: 'insensitive' } } } } },
        { group: { name: { contains: query, mode: 'insensitive' } } },
      ],
    });
  }

  const status = statusWhere(userId, filter);
  if (status) and.push(status);

  return { deletedAt: null, AND: and };
}
