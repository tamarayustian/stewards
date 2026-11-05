import { describe, expect, it } from 'vitest';

import {
  BACKFILL_NOTE,
  backfillBlockerMessage,
  backfillRequestId,
  ledgerPairs,
  planBackfill,
  settlementViolations,
  splitViolations,
} from './ledger-maintenance';

const day = (n: number) => new Date(2026, 0, n);

function split(overrides: Partial<Parameters<typeof planBackfill>[0][number]> = {}) {
  return {
    id: 'split-1',
    debtorId: 'alex',
    creditorId: 'tam',
    amountCents: 1000,
    settledCents: 0,
    settledAt: day(2),
    currency: 'HKD',
    inactiveExpense: false,
    ...overrides,
  };
}

describe('backfillRequestId', () => {
  it('is deterministic per split', () => {
    expect(backfillRequestId('split-1')).toBe('backfill:split-1');
    expect(backfillRequestId('split-1')).toBe(backfillRequestId('split-1'));
  });

  it('is unique across splits', () => {
    expect(backfillRequestId('a')).not.toBe(backfillRequestId('b'));
  });
});

describe('BACKFILL_NOTE', () => {
  it('marks synthetic rows', () => {
    expect(BACKFILL_NOTE).toBe('Backfilled');
  });
});

describe('planBackfill', () => {
  it('plans one payment from the debtor to the payer for a legacy settled split', () => {
    const { candidates } = planBackfill([split()], new Set());

    expect(candidates).toEqual([
      {
        splitId: 'split-1',
        requestId: 'backfill:split-1',
        fromUserId: 'alex',
        toUserId: 'tam',
        amountCents: 1000,
        currency: 'HKD',
        occurredAt: day(2),
      },
    ]);
  });

  it('leaves an unsettled split alone', () => {
    const { candidates, skipped } = planBackfill([split({ settledAt: null })], new Set());

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'not-settled' }]);
  });

  it("leaves the payer's own zero share alone", () => {
    const { candidates, skipped } = planBackfill(
      [split({ debtorId: 'tam', amountCents: 0, settledCents: 0 })],
      new Set(),
    );

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'zero-amount' }]);
  });

  it('never creates a self-payment', () => {
    const { candidates, skipped } = planBackfill(
      [split({ debtorId: 'tam', creditorId: 'tam' })],
      new Set(),
    );

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'self-pair' }]);
  });

  it('skips a split whose settled amount is already projected', () => {
    const { candidates, skipped } = planBackfill([split({ settledCents: 1000 })], new Set());

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'already-projected' }]);
  });

  it('is idempotent: a split with a backfill row is skipped', () => {
    const { candidates, skipped } = planBackfill([split()], new Set(['backfill:split-1']));

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'already-backfilled' }]);
  });

  it('leaves a split on a deleted expense or group alone', () => {
    const { candidates, skipped } = planBackfill([split({ inactiveExpense: true })], new Set());

    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ splitId: 'split-1', reason: 'inactive-expense' }]);
  });

  it('orders candidates by settlement date, then split id', () => {
    const { candidates } = planBackfill(
      [
        split({ id: 'b', settledAt: day(3) }),
        split({ id: 'c', settledAt: day(1) }),
        split({ id: 'a', settledAt: day(3) }),
      ],
      new Set(),
    );

    expect(candidates.map((candidate) => candidate.splitId)).toEqual(['c', 'a', 'b']);
  });
});

describe('backfillBlockerMessage', () => {
  it('returns no blocker on a correctly backfilled database', () => {
    expect(backfillBlockerMessage([split({ settledAt: null })], new Set())).toBeNull();
    expect(backfillBlockerMessage([split({ settledCents: 1000 })], new Set())).toBeNull();
  });

  it('names the pending count and the command to run first', () => {
    const message = backfillBlockerMessage([split(), split({ id: 'split-2' })], new Set());

    expect(message).toContain('2 split(s)');
    expect(message).toContain('pnpm db:backfill');
  });

  it('does not block on a split a previous backfill already covered', () => {
    expect(backfillBlockerMessage([split()], new Set(['backfill:split-1']))).toBeNull();
  });
});

describe('ledgerPairs', () => {
  it('unions pairs implied by splits and payments, deduped unordered', () => {
    expect(
      ledgerPairs(
        [
          { debtorId: 'alex', creditorId: 'tam' },
          { debtorId: 'tam', creditorId: 'sam' },
        ],
        [{ fromId: 'sam', toId: 'tam' }],
      ),
    ).toEqual([
      ['alex', 'tam'],
      ['tam', 'sam'],
    ]);
  });

  it('drops self-pairs', () => {
    expect(ledgerPairs([{ debtorId: 'tam', creditorId: 'tam' }], [])).toEqual([]);
  });

  it('returns payments with no splits as a pair', () => {
    expect(ledgerPairs([], [{ fromId: 'alex', toId: 'tam' }])).toEqual([['alex', 'tam']]);
  });
});

describe('splitViolations', () => {
  it('accepts a fully settled split stamped with a date', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 1000, settledAt: day(1) }),
    ).toEqual([]);
  });

  it('accepts an open split with no date', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 0, settledAt: null }),
    ).toEqual([]);
  });

  it('accepts a partially settled split', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 400, settledAt: null }),
    ).toEqual([]);
  });

  it('rejects cleared more than owed', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 1001, settledAt: day(1) }),
    ).toEqual(['split s: settledAmount 1001 exceeds amount 1000']);
  });

  it('rejects a negative cleared amount', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: -1, settledAt: null }),
    ).toEqual(['split s: settledAmount -1 is negative']);
  });

  it('rejects a settled date while money is still owed', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 400, settledAt: day(1) }),
    ).toEqual(['split s: settledAt is set but only 400 of 1000 is cleared']);
  });

  it('rejects a fully settled split with no date', () => {
    expect(
      splitViolations({ id: 's', amountCents: 1000, settledCents: 1000, settledAt: null }),
    ).toEqual(['split s: fully cleared but settledAt is null']);
  });

  it('tolerates either settledAt shape on a zero split', () => {
    expect(
      splitViolations({ id: 's', amountCents: 0, settledCents: 0, settledAt: day(1) }),
    ).toEqual([]);
    expect(splitViolations({ id: 's', amountCents: 0, settledCents: 0, settledAt: null })).toEqual(
      [],
    );
  });
});

describe('settlementViolations', () => {
  it('accepts a payment with allocations within its amount', () => {
    expect(
      settlementViolations({
        id: 'p',
        amountCents: 1000,
        allocatedCents: 1000,
        deleted: false,
        allocationCount: 1,
      }),
    ).toEqual([]);
  });

  it('accepts an unallocated payment (credit)', () => {
    expect(
      settlementViolations({
        id: 'p',
        amountCents: 1000,
        allocatedCents: 0,
        deleted: false,
        allocationCount: 0,
      }),
    ).toEqual([]);
  });

  it('rejects allocations beyond the payment amount', () => {
    expect(
      settlementViolations({
        id: 'p',
        amountCents: 1000,
        allocatedCents: 1001,
        deleted: false,
        allocationCount: 2,
      }),
    ).toEqual(['settlement p: allocations 1001 exceed amount 1000']);
  });

  it('rejects a deleted payment that still holds allocations', () => {
    expect(
      settlementViolations({
        id: 'p',
        amountCents: 1000,
        allocatedCents: 1000,
        deleted: true,
        allocationCount: 1,
      }),
    ).toEqual(['settlement p: soft-deleted but still holds 1 allocation(s)']);
  });
});
