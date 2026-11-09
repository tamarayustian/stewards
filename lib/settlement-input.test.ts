import { describe, expect, it } from 'vitest';

import { validateSettlementEditInput, validateSettlementInput } from './settlement-input';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  Object.entries(o).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe('validateSettlementInput', () => {
  it('rejects paying yourself', () => {
    expect(validateSettlementInput(fd({ toId: 'me', amount: '10' }), 'me')).toEqual({
      error: 'You cannot pay yourself.',
    });
  });

  it('rejects zero and negative amounts', () => {
    expect(validateSettlementInput(fd({ toId: 'alex', amount: '0' }), 'me')).toHaveProperty(
      'error',
    );
    expect(validateSettlementInput(fd({ toId: 'alex', amount: '-10' }), 'me')).toHaveProperty(
      'error',
    );
  });

  it('returns integer cents', () => {
    expect(validateSettlementInput(fd({ toId: 'alex', amount: '10.25' }), 'me')).toMatchObject({
      amountCents: 1025,
    });
  });

  it('rejects unsupported currencies', () => {
    expect(
      validateSettlementInput(fd({ toId: 'alex', amount: '10', currency: 'XYZ' }), 'me'),
    ).toHaveProperty('error');
  });

  it('defaults the currency and parses every optional field', () => {
    expect(
      validateSettlementInput(
        fd({
          toId: 'alex',
          amount: ' 10.5 ',
          occurredAt: '2026-03-04',
          note: '  dinner  ',
          splitId: 'split-1',
          requestId: 'req-1',
        }),
        'me',
      ),
    ).toEqual({
      toId: 'alex',
      amountCents: 1050,
      currency: 'HKD',
      occurredAt: new Date(2026, 2, 4),
      note: 'dinner',
      splitId: 'split-1',
      requestId: 'req-1',
    });

    expect(validateSettlementInput(fd({ toId: 'alex', amount: '10' }), 'me')).toMatchObject({
      currency: 'HKD',
      note: null,
      splitId: null,
      requestId: null,
    });
  });

  it('rejects malformed amounts instead of rounding them', () => {
    for (const amount of ['', 'abc', '10.255', '1,000', '.5', '10.']) {
      expect(
        validateSettlementInput(fd({ toId: 'alex', amount }), 'me'),
        `amount ${amount}`,
      ).toHaveProperty('error');
    }
  });

  it('rejects an invalid occurred-at date', () => {
    expect(
      validateSettlementInput(fd({ toId: 'alex', amount: '10', occurredAt: '2026-02-30' }), 'me'),
    ).toHaveProperty('error');
    expect(
      validateSettlementInput(fd({ toId: 'alex', amount: '10', occurredAt: 'not-a-date' }), 'me'),
    ).toHaveProperty('error');
  });
});

describe('validateSettlementEditInput', () => {
  it('parses the editable fields', () => {
    expect(
      validateSettlementEditInput(
        fd({ amount: '25.75', occurredAt: '2026-04-05', note: '  partial  ' }),
      ),
    ).toEqual({
      amountCents: 2575,
      occurredAt: new Date(2026, 3, 5),
      note: 'partial',
    });
  });

  it('clears an empty note', () => {
    expect(
      validateSettlementEditInput(fd({ amount: '25', occurredAt: '2026-04-05', note: '   ' })),
    ).toMatchObject({ note: null });
  });

  it('requires a positive amount and a valid date', () => {
    expect(
      validateSettlementEditInput(fd({ amount: '0', occurredAt: '2026-04-05' })),
    ).toHaveProperty('error');
    expect(validateSettlementEditInput(fd({ amount: '10' }))).toHaveProperty('error');
    expect(
      validateSettlementEditInput(fd({ amount: '10', occurredAt: '2026-13-01' })),
    ).toHaveProperty('error');
  });
});
