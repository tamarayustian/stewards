import { describe, expect, it } from 'vitest';

import {
  buildPairDetail,
  buildWhatsAppDraft,
  computePairSummaries,
  waMeNumber,
  type Counterparty,
  type PairItem,
  type ShareRow,
} from '@/lib/balance-math';
import { CURRENCIES, type Currency } from '@/lib/currencies';
import { Prisma } from '@/lib/generated/prisma/client';

const dec = (value: string) => new Prisma.Decimal(value);

const tamara: Counterparty = {
  id: 'u2',
  name: 'Tamara',
  phone: '+852 9123 4567',
  isRegistered: true,
};
const ghost: Counterparty = { id: 'u3', name: 'Ghost', phone: null, isRegistered: false };

function share(partial: Partial<ShareRow> & Pick<ShareRow, 'splitAmount'>): ShareRow {
  return {
    splitId: 's1',
    date: new Date('2026-08-16T12:00:00Z'),
    note: 'Dinner',
    amount: dec('100.00'),
    currency: 'HKD',
    convertedAmount: partial.convertedAmount ?? partial.splitAmount,
    party: tamara,
    ...partial,
  };
}

describe('computePairSummaries', () => {
  it('nets both directions for the same party', () => {
    const [pair] = computePairSummaries(
      [share({ splitId: 's1', splitAmount: dec('150.00') })],
      [share({ splitId: 's2', splitAmount: dec('40.00') })],
    );
    expect(pair.counterparty).toEqual(tamara);
    expect(pair.amountOwedToMe.toFixed(2)).toBe('150.00');
    expect(pair.amountIOwe.toFixed(2)).toBe('40.00');
    expect(pair.net.toFixed(2)).toBe('110.00');
    expect(pair.unsettledCount).toBe(1);
    expect(pair.iOweCount).toBe(1);
  });

  it('groups multiple shares per party', () => {
    const [pair] = computePairSummaries(
      [
        share({ splitId: 's1', splitAmount: dec('50.00') }),
        share({ splitId: 's2', splitAmount: dec('25.50') }),
      ],
      [],
    );
    expect(pair.amountOwedToMe.toFixed(2)).toBe('75.50');
    expect(pair.unsettledCount).toBe(2);
    expect(pair.iOweCount).toBe(0);
  });

  it('returns a zero-net pair when both sides cancel out', () => {
    const [pair] = computePairSummaries(
      [share({ splitAmount: dec('100.00') })],
      [share({ splitAmount: dec('100.00') })],
    );
    expect(pair.net.isZero()).toBe(true);
  });

  it('keeps two distinct parties separate', () => {
    const pairs = computePairSummaries(
      [
        share({ splitAmount: dec('10.00') }),
        share({ party: ghost, splitId: 's2', splitAmount: dec('20.00') }),
      ],
      [],
    );
    expect(pairs).toHaveLength(2);
  });
});

describe('buildPairDetail', () => {
  it('sorts items oldest first and tags the direction', () => {
    const detail = buildPairDetail(
      tamara,
      [share({ splitId: 's2', date: new Date('2026-08-18T12:00:00Z'), splitAmount: dec('30.00') })],
      [share({ splitId: 's1', date: new Date('2026-08-16T12:00:00Z'), splitAmount: dec('10.00') })],
    );
    expect(detail.items.map((i) => i.id)).toEqual(['s1', 's2']);
    expect(detail.items[0].direction).toBe('iOweThem');
    expect(detail.items[0].myShare.toFixed(2)).toBe('10.00');
    expect(detail.items[0].theirShare.toFixed(2)).toBe('0.00');
    expect(detail.items[1].direction).toBe('theyOweMe');
    expect(detail.net.toFixed(2)).toBe('20.00');
  });

  it('sums totals across items', () => {
    const detail = buildPairDetail(
      tamara,
      [share({ splitAmount: dec('50.00') }), share({ splitId: 's2', splitAmount: dec('25.00') })],
      [],
    );
    expect(detail.amountOwedToMe.toFixed(2)).toBe('75.00');
    expect(detail.items).toHaveLength(2);
  });
});

describe('buildWhatsAppDraft', () => {
  const items: PairItem[] = [
    {
      id: 's1',
      date: new Date('2026-08-16T12:00:00Z'),
      note: 'Dinner',
      amount: 100,
      currency: 'HKD',
      myShare: 0,
      theirShare: 100,
      convertedAmount: 100,
      direction: 'theyOweMe',
    },
    {
      id: 's2',
      date: new Date('2026-08-18T12:00:00Z'),
      note: null,
      amount: 60,
      currency: 'HKD',
      myShare: 60,
      theirShare: 0,
      convertedAmount: 60,
      direction: 'iOweThem',
    },
  ];

  it('itemizes only what they owe me and omits what I owe them', () => {
    const draft = buildWhatsAppDraft('Tamara', items, 'http://localhost:3000');
    const lines = draft.split('\n');
    expect(lines[0]).toBe('Tamara — you owe me HK$100.00 across 1 expense');
    expect(lines[1]).toContain('Dinner');
    expect(lines[2]).toBe('Settle up in Stewards: http://localhost:3000/people');
    expect(draft).not.toContain('60.00');
  });

  it('pluralizes across expenses', () => {
    const both: PairItem[] = [
      ...items,
      {
        id: 's3',
        date: new Date('2026-08-17T12:00:00Z'),
        note: 'Lunch',
        amount: 50,
        currency: 'HKD',
        myShare: 0,
        theirShare: 50,
        convertedAmount: 50,
        direction: 'theyOweMe',
      },
    ];
    const draft = buildWhatsAppDraft('Tamara', both, 'https://stewards.app');
    const lines = draft.split('\n');
    expect(lines[0]).toBe('Tamara — you owe me HK$150.00 across 2 expenses');
    expect(lines).toHaveLength(4);
  });
});

describe('computePairSummaries with convertedAmount', () => {
  it('sums convertedAmount instead of splitAmount', () => {
    const [pair] = computePairSummaries(
      [share({ splitId: 's1', splitAmount: dec('100.00'), convertedAmount: dec('55.00') })],
      [share({ splitId: 's2', splitAmount: dec('100.00'), convertedAmount: dec('55.00') })],
    );
    expect(pair.amountOwedToMe.toFixed(2)).toBe('55.00');
    expect(pair.amountIOwe.toFixed(2)).toBe('55.00');
    expect(pair.net.toFixed(2)).toBe('0.00');
  });
});

describe('waMeNumber', () => {
  it('strips everything except digits', () => {
    expect(waMeNumber('+852 9123 4567')).toBe('85291234567');
    expect(waMeNumber('+1 (212) 555-0100')).toBe('12125550100');
  });
});
