import { describe, expect, it } from 'vitest';

import { affectedPairsForExpense, affectedPairsForExpenses } from './settlement-pairs';

it('returns one unordered pair per participant, excluding the payer', () => {
  const out = affectedPairsForExpense({
    paidById: 'tam',
    splits: [{ userId: 'tam' }, { userId: 'alex' }, { userId: 'sam' }],
  });
  expect(out).toEqual([
    ['tam', 'alex'],
    ['tam', 'sam'],
  ]);
});

describe('affectedPairsForExpense', () => {
  it('returns no pair when the payer is alone on the expense', () => {
    expect(affectedPairsForExpense({ paidById: 'tam', splits: [{ userId: 'tam' }] })).toEqual([]);
  });

  it('collapses a repeated participant into one pair', () => {
    expect(
      affectedPairsForExpense({
        paidById: 'tam',
        splits: [{ userId: 'alex' }, { userId: 'tam' }, { userId: 'alex' }],
      }),
    ).toEqual([['tam', 'alex']]);
  });

  it('is pair order independent: the payer is always the first element', () => {
    expect(
      affectedPairsForExpense({ paidById: 'tam', splits: [{ userId: 'alex' }, { userId: 'tam' }] }),
    ).toEqual([['tam', 'alex']]);
  });
});

describe('affectedPairsForExpenses', () => {
  it('unions the old and new shapes so a payer change rebuilds both sides', () => {
    const out = affectedPairsForExpenses([
      { paidById: 'tam', splits: [{ userId: 'tam' }, { userId: 'alex' }, { userId: 'sam' }] },
      { paidById: 'alex', splits: [{ userId: 'tam' }, { userId: 'alex' }, { userId: 'sam' }] },
    ]);

    expect(out).toEqual([
      ['tam', 'alex'],
      ['tam', 'sam'],
      ['alex', 'sam'],
    ]);
  });

  it('collapses a pair that both shapes imply', () => {
    const out = affectedPairsForExpenses([
      { paidById: 'tam', splits: [{ userId: 'tam' }, { userId: 'alex' }] },
      { paidById: 'tam', splits: [{ userId: 'tam' }, { userId: 'alex' }] },
    ]);

    expect(out).toEqual([['tam', 'alex']]);
  });

  it('returns an empty list for an expense with no counterparty in any shape', () => {
    expect(
      affectedPairsForExpenses([
        { paidById: 'tam', splits: [{ userId: 'tam' }] },
        { paidById: 'tam', splits: [{ userId: 'tam' }] },
      ]),
    ).toEqual([]);
  });
});
