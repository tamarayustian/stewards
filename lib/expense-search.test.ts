import { describe, expect, it } from 'vitest';

import {
  buildActivityWhere,
  parseActivityFilter,
  parseExpenseGroup,
  parseExpenseQuery,
} from './expense-search';

describe('parseExpenseQuery', () => {
  it('trims a query and caps it at 80 characters', () => {
    expect(parseExpenseQuery('  dinner  ')).toBe('dinner');
    expect(parseExpenseQuery('x'.repeat(90))).toHaveLength(80);
    expect(parseExpenseQuery()).toBe('');
  });
});

describe('parseExpenseGroup', () => {
  it('defaults to all and keeps direct or a group id', () => {
    expect(parseExpenseGroup()).toBe('all');
    expect(parseExpenseGroup('  ')).toBe('all');
    expect(parseExpenseGroup('direct')).toBe('direct');
    expect(parseExpenseGroup(' group-1 ')).toBe('group-1');
  });
});

describe('parseActivityFilter', () => {
  it('maps the known statuses and falls back to all', () => {
    expect(parseActivityFilter('owe')).toBe('owe');
    expect(parseActivityFilter('owed')).toBe('owed');
    expect(parseActivityFilter('paid')).toBe('paid');
    expect(parseActivityFilter('nope')).toBe('all');
    expect(parseActivityFilter()).toBe('all');
  });
});

describe('buildActivityWhere', () => {
  it('composes search, direct and status clauses', () => {
    const where = buildActivityWhere('me', 'owe', { q: 'dinner', group: 'direct' });
    const and = where.AND as unknown[];

    expect(where.deletedAt).toBeNull();
    expect(and).toEqual(
      expect.arrayContaining([
        { groupId: null },
        {
          OR: [
            { note: { contains: 'dinner', mode: 'insensitive' } },
            { paidBy: { name: { contains: 'dinner', mode: 'insensitive' } } },
            {
              splits: {
                some: { user: { name: { contains: 'dinner', mode: 'insensitive' } } },
              },
            },
            { group: { name: { contains: 'dinner', mode: 'insensitive' } } },
          ],
        },
        {
          paidById: { not: 'me' },
          splits: { some: { userId: 'me', settledAt: null, amount: { gt: 0 } } },
        },
      ]),
    );
  });

  it('restricts a group id to membership', () => {
    const where = buildActivityWhere('me', 'all', { group: 'group-1' });
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { group: { id: 'group-1', members: { some: { userId: 'me' } } } },
      ]),
    );
  });

  it('omits search and group clauses for the defaults', () => {
    const where = buildActivityWhere('me', 'all', {});
    const and = where.AND as unknown[];

    expect(and).not.toEqual(expect.arrayContaining([{ groupId: null }]));
    expect(and.some((clause) => 'OR' in (clause as object))).toBe(true);
    expect(and).toHaveLength(2);
  });
});
