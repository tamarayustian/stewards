import { describe, expect, it } from 'vitest';

import { CURRENCIES, validateCurrency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';
import { Prisma } from '@/lib/generated/prisma/client';

describe('CURRENCIES', () => {
  it('has exactly 12 entries', () => {
    expect(Object.keys(CURRENCIES)).toHaveLength(12);
  });

  it('every entry has name, symbol, and decimals', () => {
    for (const [, info] of Object.entries(CURRENCIES)) {
      expect(typeof info.name).toBe('string');
      expect(typeof info.symbol).toBe('string');
      expect(typeof info.decimals).toBe('number');
    }
  });

  it('JPY and KRW have 0 decimals', () => {
    expect(CURRENCIES.JPY.decimals).toBe(0);
    expect(CURRENCIES.KRW.decimals).toBe(0);
  });

  it('HKD has 2 decimals', () => {
    expect(CURRENCIES.HKD.decimals).toBe(2);
  });
});

describe('validateCurrency', () => {
  it('returns the code for valid currencies', () => {
    expect(validateCurrency('HKD')).toBe('HKD');
    expect(validateCurrency('JPY')).toBe('JPY');
  });

  it('returns null for invalid codes', () => {
    expect(validateCurrency('XYZ')).toBeNull();
    expect(validateCurrency('')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats HKD with 2 decimals', () => {
    const result = formatMoney(42.5, 'HKD');
    expect(result).toContain('42.50');
    expect(result).toContain('HK$');
  });

  it('formats JPY with 0 decimals', () => {
    const result = formatMoney(1000, 'JPY');
    expect(result).toContain('1,000');
    expect(result).not.toContain('1,000.0');
  });

  it('defaults to HKD when no currency specified', () => {
    const result = formatMoney(10);
    expect(result).toContain('HK$');
  });

  it('handles Prisma.Decimal input', () => {
    const dec = new Prisma.Decimal(25.5);
    const result = formatMoney(dec, 'USD');
    expect(result).toContain('25.50');
  });
});
