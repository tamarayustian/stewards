import { Prisma } from '@/lib/generated/prisma/client';
import { describe, expect, it } from 'vitest';

import { summarizeGroupBalances, type GroupExpenseRow } from './group-balances';

const d = (n: string) => new Prisma.Decimal(n);

describe('summarizeGroupBalances', () => {
  const dinner: GroupExpenseRow = {
    amount: d('100'),
    currency: 'HKD',
    rate: null,
    paidById: 'me',
    splits: [
      { userId: 'a', amount: d('50'), settledAmount: d('0') },
      { userId: 'b', amount: d('50'), settledAmount: d('50') },
    ],
  };

  it('counts the whole expense once in the group total', () => {
    expect(summarizeGroupBalances([dinner], 'me', 'HKD').total.toFixed(2)).toBe('100.00');
  });

  it('collects only outstanding shares from others', () => {
    const result = summarizeGroupBalances([dinner], 'me', 'HKD');

    expect(result.owedToViewer.toFixed(2)).toBe('50.00');
    expect(result.viewerOwes.toFixed(2)).toBe('0.00');
    expect(result.memberNets.get('a')?.toFixed(2)).toBe('50.00');
    expect(result.memberNets.get('b')?.toFixed(2)).toBe('0.00');
  });

  it('converts foreign amounts before summing', () => {
    const trip: GroupExpenseRow = {
      amount: d('100'),
      currency: 'USD',
      rate: '7.8',
      paidById: 'me',
      splits: [{ userId: 'a', amount: d('50'), settledAmount: d('0') }],
    };
    const result = summarizeGroupBalances([trip], 'me', 'HKD');

    expect(result.total.toFixed(2)).toBe('780.00');
    expect(result.owedToViewer.toFixed(2)).toBe('390.00');
  });

  it('records what the viewer owes and the payer net', () => {
    const lunch: GroupExpenseRow = {
      amount: d('80'),
      currency: 'HKD',
      rate: null,
      paidById: 'a',
      splits: [{ userId: 'me', amount: d('40'), settledAmount: d('0') }],
    };
    const result = summarizeGroupBalances([lunch], 'me', 'HKD');

    expect(result.viewerOwes.toFixed(2)).toBe('40.00');
    expect(result.memberNets.get('a')?.toFixed(2)).toBe('-40.00');
    expect(result.owedToViewer.toFixed(2)).toBe('0.00');
  });
});
