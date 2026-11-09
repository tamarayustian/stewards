import { describe, expect, it } from 'vitest';
import { groupSettleAllTargets, type SettleTarget } from './settlement-targets';

it('groups by creditor and currency, oldest first', () => {
  const out = groupSettleAllTargets([
    {
      creditorId: 'alex',
      currency: 'HKD',
      splitId: 's2',
      amountCents: 50_00,
      occurredAt: new Date(2026, 0, 2),
      createdAt: new Date(2026, 0, 2),
    },
    {
      creditorId: 'alex',
      currency: 'HKD',
      splitId: 's1',
      amountCents: 100_00,
      occurredAt: new Date(2026, 0, 1),
      createdAt: new Date(2026, 0, 1),
    },
    {
      creditorId: 'sam',
      currency: 'USD',
      splitId: 's3',
      amountCents: 20_00,
      occurredAt: new Date(2026, 0, 3),
      createdAt: new Date(2026, 0, 3),
    },
  ]);
  expect(out).toEqual([
    { creditorId: 'alex', currency: 'HKD', amountCents: 150_00, splitIds: ['s1', 's2'] },
    { creditorId: 'sam', currency: 'USD', amountCents: 20_00, splitIds: ['s3'] },
  ]);
});

const target = (
  splitId: string,
  amountCents: number,
  occurredAt: Date,
  createdAt = occurredAt,
  overrides: Partial<SettleTarget> = {},
): SettleTarget => ({
  creditorId: 'alex',
  currency: 'HKD',
  splitId,
  amountCents,
  occurredAt,
  createdAt,
  ...overrides,
});

describe('groupSettleAllTargets', () => {
  it('keeps one creditor in two currencies apart', () => {
    const out = groupSettleAllTargets([
      target('s1', 100_00, new Date(2026, 0, 1)),
      target('s2', 20_00, new Date(2026, 0, 1), undefined, { currency: 'USD' }),
    ]);

    expect(out).toEqual([
      { creditorId: 'alex', currency: 'HKD', amountCents: 100_00, splitIds: ['s1'] },
      { creditorId: 'alex', currency: 'USD', amountCents: 20_00, splitIds: ['s2'] },
    ]);
  });

  it('drops splits with no outstanding', () => {
    const out = groupSettleAllTargets([
      target('s1', 0, new Date(2026, 0, 1)),
      target('s2', -5_00, new Date(2026, 0, 1)),
      target('s3', 10_00, new Date(2026, 0, 2)),
    ]);

    expect(out).toEqual([
      { creditorId: 'alex', currency: 'HKD', amountCents: 10_00, splitIds: ['s3'] },
    ]);
  });

  it('breaks same-date ties by creation time, then split id', () => {
    const day = new Date(2026, 0, 1);
    const out = groupSettleAllTargets([
      target('b', 1_00, day, new Date(2026, 0, 2)),
      target('c', 1_00, day, day),
      target('a', 1_00, day, day),
    ]);

    expect(out[0].splitIds).toEqual(['a', 'c', 'b']);
  });
});
