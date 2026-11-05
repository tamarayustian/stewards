import { describe, expect, it } from 'vitest';

import {
  nextSettledAt,
  pairSettlementSelect,
  settlementPairKey,
  toAllocationPayment,
  toAllocationSplit,
} from './settlements';
import { allocateSettlements } from './settlement-allocation';

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
        pinnedSplitId: null,
      } as never),
    ).toEqual({
      id: 'p1',
      fromId: 'alex',
      toId: 'tam',
      amountCents: 4010,
      currency: 'HKD',
      occurredAt: new Date(2026, 1, 2),
      createdAt: new Date(2026, 1, 2, 3),
      pinnedSplitId: null,
    });
  });

  it('passes the pinned split through to the engine', () => {
    expect(
      toAllocationPayment({
        id: 'p2',
        fromUserId: 'alex',
        toUserId: 'tam',
        amount: '100.00',
        currency: 'HKD',
        occurredAt: new Date(2026, 1, 3),
        createdAt: new Date(2026, 1, 3, 4),
        pinnedSplitId: 's2',
      } as never),
    ).toMatchObject({ pinnedSplitId: 's2' });
  });

  it('clears a pinned split before an older open split', () => {
    const older = toAllocationSplit({
      id: 's1',
      userId: 'alex',
      amount: '100.00',
      settledAmount: '0.00',
      expense: {
        paidById: 'tam',
        currency: 'HKD',
        createdAt: new Date(2026, 0, 1),
      },
    } as never);
    const target = toAllocationSplit({
      id: 's2',
      userId: 'alex',
      amount: '100.00',
      settledAmount: '0.00',
      expense: {
        paidById: 'tam',
        currency: 'HKD',
        createdAt: new Date(2026, 0, 2),
      },
    } as never);
    const payment = toAllocationPayment({
      id: 'p1',
      fromUserId: 'alex',
      toUserId: 'tam',
      amount: '100.00',
      currency: 'HKD',
      occurredAt: new Date(2026, 0, 3),
      createdAt: new Date(2026, 0, 3),
      pinnedSplitId: 's2',
    } as never);

    expect(
      allocateSettlements({ splits: [older, target], payments: [payment] }).allocations,
    ).toEqual([{ settlementId: 'p1', splitId: 's2', amountCents: 10000 }]);
  });
});

describe('pairSettlementSelect', () => {
  it('loads the pin column the rebuild maps into the engine', () => {
    expect(pairSettlementSelect).toMatchObject({ pinnedSplitId: true });
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
