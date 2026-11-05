import { describe, expect, it } from 'vitest';

import {
  nextSettledAt,
  settlementPairKey,
  toAllocationPayment,
  toAllocationSplit,
} from './settlements';

describe('settlementPairKey', () => {
  it('builds an unordered pair key', () => {
    expect(settlementPairKey('b', 'a')).toBe('a:b');
  });

  it('returns the same key for either argument order', () => {
    expect(settlementPairKey('tam', 'alex')).toBe(settlementPairKey('alex', 'tam'));
  });
});

describe('toAllocationSplit', () => {
  it('converts a decimal split to integer cents', () => {
    expect(
      toAllocationSplit({
        id: 's1',
        userId: 'alex',
        amount: '100.25',
        settledAmount: '25.25',
        expense: {
          paidById: 'tam',
          currency: 'HKD',
          createdAt: new Date(2026, 0, 1),
          rate: null,
        },
      } as never),
    ).toMatchObject({
      id: 's1',
      debtorId: 'alex',
      creditorId: 'tam',
      amountCents: 10025,
      settledCents: 2525,
      currency: 'HKD',
      occurredAt: new Date(2026, 0, 1),
      createdAt: new Date(2026, 0, 1),
    });
  });

  it('converts tenths without floating point drift', () => {
    const split = toAllocationSplit({
      id: 's1',
      userId: 'alex',
      amount: '0.10',
      settledAmount: '0.00',
      expense: { paidById: 'tam', currency: 'HKD', createdAt: new Date(2026, 0, 1) },
    } as never);

    expect(split.amountCents).toBe(10);
    expect(split.settledCents).toBe(0);
  });
});

describe('toAllocationPayment', () => {
  it('converts a decimal settlement to integer cents', () => {
    expect(
      toAllocationPayment({
        id: 'p1',
        fromUserId: 'alex',
        toUserId: 'tam',
        amount: '40.10',
        currency: 'HKD',
        occurredAt: new Date(2026, 1, 2),
        createdAt: new Date(2026, 1, 2, 3),
      } as never),
    ).toEqual({
      id: 'p1',
      fromId: 'alex',
      toId: 'tam',
      amountCents: 4010,
      currency: 'HKD',
      occurredAt: new Date(2026, 1, 2),
      createdAt: new Date(2026, 1, 2, 3),
      // This schema has no pin column; pinning is expressed by settlement amount.
      pinnedSplitId: null,
    });
  });
});

describe('nextSettledAt', () => {
  const now = new Date(2026, 2, 3);

  it('keeps a partially settled split open', () => {
    expect(nextSettledAt({ current: null, settledCents: 500, amountCents: 1000, now })).toBeNull();
  });

  it('clears settledAt again when payments no longer cover the split', () => {
    expect(
      nextSettledAt({
        current: new Date(2026, 0, 1),
        settledCents: 500,
        amountCents: 1000,
        now,
      }),
    ).toBeNull();
  });

  it('stamps now when a split becomes fully settled', () => {
    expect(nextSettledAt({ current: null, settledCents: 1000, amountCents: 1000, now })).toBe(now);
  });

  it('preserves the original settledAt on a rebuild', () => {
    const original = new Date(2026, 0, 1);
    expect(nextSettledAt({ current: original, settledCents: 1000, amountCents: 1000, now })).toBe(
      original,
    );
  });
});
