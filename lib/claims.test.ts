import { describe, expect, it } from 'vitest';

import {
  decideRepoints,
  decideSettlementRepoints,
  decideSplitTransfers,
  filterUnclaimed,
  matchesIdentity,
  mergeSplitTotals,
  normalizeName,
  settlementRepointPairs,
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
    expect(
      matchesIdentity({ ...sarah, email: null, phone: null }, ghost({ name: '  sarah lee ' })),
    ).toBe(true);
  });

  it('matches on identical phone', () => {
    expect(matchesIdentity({ ...sarah, email: null }, ghost({ phone: '+85291112222' }))).toBe(true);
  });

  it('does not match a ghost with no email/name/phone overlap', () => {
    expect(matchesIdentity(sarah, ghost({ email: 'other@example.com', name: 'Lisa Wong' }))).toBe(
      false,
    );
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
    const decisions = decideSplitTransfers([{ id: 'gs1', expenseId: 'e1', amount: '80.00' }], []);
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

describe('mergeSplitTotals', () => {
  it('sums amount and settled amount across the merged shares', () => {
    const merged = mergeSplitTotals(
      { amountCents: 6000, settledCents: 2000, settledAt: null },
      { amountCents: 4000, settledCents: 4000, settledAt: new Date(2026, 0, 2) },
    );

    expect(merged).toEqual({
      amountCents: 10000,
      settledCents: 6000,
      settledAt: null,
    });
  });

  it('carries settledAt forward when the merged share ends fully settled', () => {
    const paid = new Date(2026, 0, 2);
    const merged = mergeSplitTotals(
      { amountCents: 6000, settledCents: 2000, settledAt: null },
      { amountCents: 4000, settledCents: 4000, settledAt: paid },
    );

    expect(merged.settledCents).toBe(6000);
    // The target's own settledAt wins when both are present.
    expect(
      mergeSplitTotals(
        { amountCents: 6000, settledCents: 6000, settledAt: new Date(2026, 0, 1) },
        { amountCents: 4000, settledCents: 4000, settledAt: paid },
      ).settledAt,
    ).toEqual(new Date(2026, 0, 1));
  });

  it('clears settledAt when the merged share is only part-paid', () => {
    const merged = mergeSplitTotals(
      { amountCents: 6000, settledCents: 0, settledAt: null },
      { amountCents: 4000, settledCents: 1000, settledAt: new Date(2026, 0, 2) },
    );

    expect(merged.settledAt).toBeNull();
  });
});

describe('decideSettlementRepoints', () => {
  it('moves a payment from the ghost to the target on either side', () => {
    expect(
      decideSettlementRepoints(
        [
          { id: 's1', fromUserId: 'ghost', toUserId: 'tam' },
          { id: 's2', fromUserId: 'tam', toUserId: 'ghost' },
        ],
        'ghost',
        'target',
      ),
    ).toEqual([
      { kind: 'repoint', id: 's1', fromUserId: 'target', toUserId: 'tam' },
      { kind: 'repoint', id: 's2', fromUserId: 'tam', toUserId: 'target' },
    ]);
  });

  it('keeps a payment that never named the ghost', () => {
    expect(
      decideSettlementRepoints(
        [{ id: 's1', fromUserId: 'tam', toUserId: 'sam' }],
        'ghost',
        'target',
      ),
    ).toEqual([{ kind: 'keep', id: 's1' }]);
  });

  it('drops a payment that would end up between the target and themself', () => {
    expect(
      decideSettlementRepoints(
        [{ id: 's1', fromUserId: 'ghost', toUserId: 'target' }],
        'ghost',
        'target',
      ),
    ).toEqual([{ kind: 'drop', id: 's1' }]);
  });
});

describe('settlementRepointPairs', () => {
  it('collects the pair each repointed payment lands on, ignoring kept and dropped ones', () => {
    const pairs = settlementRepointPairs([
      { kind: 'repoint', id: 's1', fromUserId: 'target', toUserId: 'tam' },
      { kind: 'keep', id: 's2' },
      { kind: 'drop', id: 's3' },
      { kind: 'repoint', id: 's4', fromUserId: 'sam', toUserId: 'target' },
    ]);

    expect(pairs).toEqual([
      ['target', 'tam'],
      ['sam', 'target'],
    ]);
  });

  it('returns nothing when no payment was repointed', () => {
    expect(settlementRepointPairs([{ kind: 'keep', id: 's1' }])).toEqual([]);
  });
});
