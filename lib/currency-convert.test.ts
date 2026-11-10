import { Prisma } from '@/lib/generated/prisma/client';
import { describe, expect, it } from 'vitest';

import { toViewerCurrency } from './currency-convert';

const d = (n: string) => new Prisma.Decimal(n);

describe('toViewerCurrency', () => {
  it('leaves same-currency amounts alone', () =>
    expect(toViewerCurrency(d('100'), 'HKD', '2', 'HKD').toFixed(2)).toBe('100.00'));

  it('multiplies by the stored rate', () =>
    expect(toViewerCurrency(d('100'), 'HKD', '0.13', 'USD').toFixed(2)).toBe('13.00'));

  it('treats a missing rate as 1', () =>
    expect(toViewerCurrency(d('100'), 'HKD', null, 'USD').toFixed(2)).toBe('100.00'));
});
