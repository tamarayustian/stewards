import { describe, expect, it } from 'vitest';
import { moneyParts } from './money';

describe('moneyParts', () => {
  it('splits HKD into symbol and grouped value', () =>
    expect(moneyParts(1234.5, 'HKD')).toEqual({ symbol: 'HK$', value: '1,234.50' }));
  it('uses zero decimals for JPY', () =>
    expect(moneyParts(1000, 'JPY')).toEqual({ symbol: '¥', value: '1,000' }));
  it('falls back to HKD for an unknown currency', () =>
    expect(moneyParts(10, 'ZZZ')).toEqual({ symbol: 'HK$', value: '10.00' }));
});
