import { describe, expect, it } from 'vitest';

import { Prisma } from '@/lib/generated/prisma/client';
import { Prisma as PrismaValue } from '@/lib/generated/prisma/browser';
import {
  hasOutstandingShare,
  outstandingCents,
  outstandingDecimal,
  summarizePairCredits,
  type CreditSettlement,
} from './outstanding';

const dec = (value: string) => new Prisma.Decimal(value);

describe('outstandingCents', () => {
  it('subtracts cleared from amount', () => {
    expect(outstandingCents('100.00', '25.25')).toBe(7475);
  });

  it('never returns negative', () => {
    expect(outstandingCents('100.00', '120.00')).toBe(0);
  });

  it('returns the full amount when nothing is cleared', () => {
    expect(outstandingCents('42.10', '0.00')).toBe(4210);
  });

  it('returns zero when fully settled', () => {
    expect(outstandingCents('42.10', '42.10')).toBe(0);
  });

  it('converts tenths without floating point drift', () => {
    expect(outstandingCents('0.30', '0.10')).toBe(20);
  });

  it('accepts Decimal inputs', () => {
    expect(outstandingCents(dec('100.00'), dec('0.75'))).toBe(9925);
  });
});

describe('hasOutstandingShare', () => {
  it('treats a zero-amount payer split as no debt', () => {
    expect(hasOutstandingShare('0.00', '0.00')).toBe(false);
  });

  it('keeps a part-paid share outstanding', () => {
    expect(hasOutstandingShare('100.00', '25.25')).toBe(true);
  });

  it('drops a fully settled share', () => {
    expect(hasOutstandingShare('100.00', '100.00')).toBe(false);
  });

  it('drops an over-settled share', () => {
    expect(hasOutstandingShare('100.00', '120.00')).toBe(false);
  });
});

describe('outstandingDecimal', () => {
  it('returns the remainder in major units', () => {
    const value = outstandingDecimal('100.00', '25.25');
    expect(value).toBeInstanceOf(PrismaValue.Decimal);
    expect(value.toFixed(2)).toBe('74.75');
  });

  it('clamps an overpayment to zero', () => {
    expect(outstandingDecimal('100.00', '120.00').isZero()).toBe(true);
  });

  it('agrees with outstandingCents', () => {
    expect(outstandingDecimal('0.30', '0.10').toFixed(2)).toBe('0.20');
  });
});

function settlement(partial: Partial<CreditSettlement> & Pick<CreditSettlement, 'amount'>) {
  return {
    fromUserId: 'me',
    toUserId: 'alex',
    currency: 'HKD',
    allocations: [],
    ...partial,
  } satisfies CreditSettlement;
}

describe('summarizePairCredits', () => {
  it('reports credit in the viewer\u2019s favor when the viewer overpaid', () => {
    const [credit] = summarizePairCredits('me', [
      settlement({ amount: '100.00', allocations: [{ amount: '60.00' }] }),
    ]);
    expect(credit).toMatchObject({ counterpartyId: 'alex', currency: 'HKD', inViewersFavor: true });
    expect(credit.amount.toFixed(2)).toBe('40.00');
  });

  it('reports credit for the counterparty when the viewer was paid too much', () => {
    const [credit] = summarizePairCredits('me', [
      settlement({
        fromUserId: 'alex',
        toUserId: 'me',
        amount: '50.00',
        allocations: [{ amount: '20.00' }],
      }),
    ]);
    expect(credit).toMatchObject({
      counterpartyId: 'alex',
      currency: 'HKD',
      inViewersFavor: false,
    });
    expect(credit.amount.toFixed(2)).toBe('30.00');
  });

  it('groups by counterparty, currency, and direction', () => {
    const credits = summarizePairCredits('me', [
      settlement({ amount: '100.00', allocations: [{ amount: '90.00' }] }),
      settlement({ amount: '40.00' }),
      settlement({
        fromUserId: 'alex',
        toUserId: 'me',
        currency: 'USD',
        amount: '10.00',
        allocations: [{ amount: '4.00' }],
      }),
      settlement({
        toUserId: 'sam',
        amount: '20.00',
        allocations: [{ amount: '5.00' }, { amount: '5.00' }],
      }),
    ]);

    expect(
      credits.map((credit) => ({
        counterpartyId: credit.counterpartyId,
        currency: credit.currency,
        inViewersFavor: credit.inViewersFavor,
        amount: credit.amount.toFixed(2),
      })),
    ).toEqual([
      { counterpartyId: 'alex', currency: 'HKD', inViewersFavor: true, amount: '50.00' },
      { counterpartyId: 'alex', currency: 'USD', inViewersFavor: false, amount: '6.00' },
      { counterpartyId: 'sam', currency: 'HKD', inViewersFavor: true, amount: '10.00' },
    ]);
  });

  it('ignores fully allocated settlements', () => {
    expect(
      summarizePairCredits('me', [
        settlement({ amount: '25.00', allocations: [{ amount: '25.00' }] }),
        settlement({ amount: '0.00' }),
      ]),
    ).toEqual([]);
  });

  it('ignores settlements the viewer is not part of', () => {
    expect(
      summarizePairCredits('me', [
        settlement({ fromUserId: 'alex', toUserId: 'sam', amount: '25.00' }),
      ]),
    ).toEqual([]);
  });

  it('never reports negative credit when allocations exceed the payment', () => {
    expect(
      summarizePairCredits('me', [
        settlement({ amount: '10.00', allocations: [{ amount: '12.00' }] }),
      ]),
    ).toEqual([]);
  });
});
