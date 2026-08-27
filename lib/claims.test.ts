import { describe, expect, it } from 'vitest';

import {
  decideRepoints,
  decideSplitTransfers,
  filterUnclaimed,
  matchesIdentity,
  normalizeName,
  type GhostIdentity,
} from './claims';

const ghost = (over: Partial<GhostIdentity> = {}): GhostIdentity => ({
  id: 'g1',
  email: null,
  name: 'Sarah Lee',
  phone: null,
  ...over,
});

describe('normalizeName', () => {
  it('trims and lowercases', () => {
    expect(normalizeName('  Sarah Lee  ')).toBe('sarah lee');
  });
});

describe('matchesIdentity', () => {
  const sarah = { email: 'sarah@example.com', name: 'Sarah Lee', phone: '+85291112222' };

  it('matches on identical email', () => {
    expect(matchesIdentity(sarah, ghost({ email: 'sarah@example.com' }))).toBe(true);
  });

  it('matches on case-insensitive trimmed name', () => {
    expect(matchesIdentity({ ...sarah, email: null, phone: null }, ghost({ name: '  sarah lee ' }))).toBe(true);
  });

  it('matches on identical phone', () => {
    expect(matchesIdentity({ ...sarah, email: null }, ghost({ phone: '+85291112222' }))).toBe(true);
  });

  it('does not match a ghost with no email/name/phone overlap', () => {
    expect(matchesIdentity(sarah, ghost({ email: 'other@example.com', name: 'Lisa Wong' }))).toBe(false);
  });

  it('does not match on email when either side is null', () => {
    expect(
      matchesIdentity(
        { ...sarah, email: null },
        ghost({ email: 'sarah@example.com', name: 'Other Person' }),
      ),
    ).toBe(false);
  });
});

describe('filterUnclaimed', () => {
  it('drops ghosts already claimed by this user', () => {
    const ghosts = [ghost({ id: 'g1' }), ghost({ id: 'g2' })];
    expect(filterUnclaimed(ghosts, new Set(['g1'])).map((g) => g.id)).toEqual(['g2']);
  });
});

describe('decideSplitTransfers', () => {
  it('sums a split when the target already has one on the same expense', () => {
    const decisions = decideSplitTransfers(
      [{ id: 'gs1', expenseId: 'e1', amount: '80.00' }],
      [{ expenseId: 'e1', id: 'ts1' }],
    );
    expect(decisions).toEqual([{ kind: 'sum', splitId: 'gs1', expenseId: 'e1', amount: '80.00' }]);
  });

  it('repoints a split when the target has none on that expense', () => {
    const decisions = decideSplitTransfers(
      [{ id: 'gs1', expenseId: 'e1', amount: '80.00' }],
      [],
    );
    expect(decisions).toEqual([{ kind: 'repoint', splitId: 'gs1' }]);
  });
});

describe('decideRepoints', () => {
  it('drops a row whose key the target already occupies', () => {
    expect(decideRepoints([{ id: 'm1', key: 'grp1' }], new Set(['grp1']))).toEqual([
      { kind: 'drop', id: 'm1' },
    ]);
  });

  it('repoints a row whose key is free', () => {
    expect(decideRepoints([{ id: 'm1', key: 'grp1' }], new Set())).toEqual([
      { kind: 'repoint', id: 'm1' },
    ]);
  });
});
