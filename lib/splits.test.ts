import { describe, expect, it } from 'vitest';
import { equalAmounts, formatAmount, totalCents } from './splits';

const people = [
  { id: 'me', name: 'You' },
  { id: 'alex', name: 'Alex' },
  { id: 'sam', name: 'Sam' },
];

describe('equalAmounts', () => {
  it('gives the whole total to the borrowers and nothing to the payer', () => {
    const out = equalAmounts(people, '30.00', 'me');
    expect(out).toEqual({ me: '0.00', alex: '15.00', sam: '15.00' });
  });

  it('excludes whichever row is the payer, not just the current user', () => {
    const out = equalAmounts(people, '30.00', 'alex');
    expect(out).toEqual({ me: '15.00', alex: '0.00', sam: '15.00' });
  });

  it('spreads the rounding remainder onto the last borrower', () => {
    const out = equalAmounts(people, '10.00', 'me');
    expect(out).toEqual({ me: '0.00', alex: '5.00', sam: '5.00' });

    const uneven = equalAmounts(people, '10.01', 'me');
    expect(uneven.me).toBe('0.00');
    expect(totalCents(uneven.alex ?? '') + totalCents(uneven.sam ?? '')).toBe(1001);
    expect(uneven.sam).toBe('5.01');
  });

  it('returns all zeros when the payer is the only participant', () => {
    expect(equalAmounts([{ id: 'me', name: 'You' }], '25.00', 'me')).toEqual({ me: '0.00' });
  });

  it('returns all zeros when there is no amount yet', () => {
    expect(equalAmounts(people, '', 'me')).toEqual({ me: '0.00', alex: '0.00', sam: '0.00' });
  });

  it('always produces amounts that sum to the total across borrowers', () => {
    for (const amount of ['0.01', '1.00', '99.99', '1234.56']) {
      const out = equalAmounts(people, amount, 'sam');
      const sum = people.reduce((acc, p) => acc + totalCents(out[p.id] ?? ''), 0);
      expect(sum).toBe(totalCents(amount));
      expect(out.sam).toBe('0.00');
    }
  });
});

describe('totalCents', () => {
  it('parses decimal strings exactly into minor units', () => {
    expect(totalCents('10.01')).toBe(1001);
    expect(totalCents('0')).toBe(0);
    expect(totalCents('')).toBe(0);
    expect(totalCents('not money')).toBe(0);
  });

  it('formats back to two decimals', () => {
    expect(formatAmount(1001)).toBe('10.01');
    expect(formatAmount(0)).toBe('0.00');
  });
});
