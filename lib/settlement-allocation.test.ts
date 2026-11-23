import { expect, it } from 'vitest';
import { allocateSettlements, type AllocationInput } from './settlement-allocation';

const day = (n: number) => new Date(2026, 0, n);
const split = (id: string, amountCents: number, n: number, extra = {}) => ({
  id,
  debtorId: 'alex',
  creditorId: 'tam',
  amountCents,
  currency: 'HKD',
  occurredAt: day(n),
  createdAt: day(n),
  ...extra,
});
const pay = (id: string, amountCents: number, n: number, extra = {}) => ({
  id,
  fromId: 'alex',
  toId: 'tam',
  amountCents,
  currency: 'HKD',
  occurredAt: day(n),
  createdAt: day(n),
  ...extra,
});

it('allocates oldest first', () => {
  const r = allocateSettlements({
    splits: [split('s2', 100_00, 2), split('s1', 100_00, 1)],
    payments: [pay('p1', 150_00, 5)],
  });
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 100_00 },
    { settlementId: 'p1', splitId: 's2', amountCents: 50_00 },
  ]);
});
it('honours a pinned split first', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1), split('s2', 100_00, 2)],
    payments: [pay('p1', 60_00, 5, { pinnedSplitId: 's2' })],
  });
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 's2', amountCents: 60_00 }]);
});
it('falls back to oldest first when the pin is not eligible', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('p1', 50_00, 5, { pinnedSplitId: 'missing' })],
  });
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 's1', amountCents: 50_00 }]);
});
it('keeps excess as credit', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('p1', 150_00, 5)],
  });
  expect(r.creditCents.get('HKD')).toBe(50_00);
});
it('never allocates across currencies', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1, { currency: 'USD' })],
    payments: [pay('p1', 100_00, 5)],
  });
  expect(r.allocations).toEqual([]);
  expect(r.creditCents.get('HKD')).toBe(100_00);
});
it('only allocates the matching direction', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1, { debtorId: 'tam', creditorId: 'alex' })],
    payments: [pay('p1', 100_00, 5)],
  });
  expect(r.allocations).toEqual([]);
});
it('caps at outstanding across multiple payments', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('p1', 80_00, 2), pay('p2', 80_00, 3)],
  });
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 80_00 },
    { settlementId: 'p2', splitId: 's1', amountCents: 20_00 },
  ]);
  expect(r.creditCents.get('HKD')).toBe(60_00);
});
it('is deterministic for same-date ties by createdAt then id', () => {
  const a = split('a', 10_00, 1, { createdAt: day(1) });
  const b = split('b', 10_00, 1, { createdAt: day(1) });
  const r = allocateSettlements({ splits: [b, a], payments: [pay('p', 10_00, 2)] });
  expect(r.allocations[0].splitId).toBe('a');
});
it('breaks a same-date split tie by createdAt', () => {
  const r = allocateSettlements({
    splits: [
      split('a-later', 100_00, 1, { createdAt: day(5) }),
      split('z-earlier', 100_00, 1, { createdAt: day(2) }),
    ],
    payments: [pay('p1', 100_00, 6)],
  });
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 'z-earlier', amountCents: 100_00 },
  ]);
});
it('applies payments oldest first regardless of input order', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('late', 100_00, 5), pay('early', 100_00, 2)],
  });
  expect(r.allocations).toEqual([{ settlementId: 'early', splitId: 's1', amountCents: 100_00 }]);
  expect(r.creditCents.get('HKD')).toBe(100_00);
});
it('breaks a same-date payment tie by createdAt', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [
      pay('a', 50_00, 3, { createdAt: day(5) }),
      pay('b', 50_00, 3, { createdAt: day(2) }),
    ],
  });
  expect(r.allocations.map((allocation) => allocation.settlementId)).toEqual(['b', 'a']);
});
it('breaks an identical payment tie by id', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('p2', 50_00, 3), pay('p1', 50_00, 3)],
  });
  expect(r.allocations.map((allocation) => allocation.settlementId)).toEqual(['p1', 'p2']);
});
it('falls back to oldest first when the pinned split is in another currency', () => {
  const r = allocateSettlements({
    splits: [split('hkd', 100_00, 1), split('usd', 100_00, 1, { currency: 'USD' })],
    payments: [pay('p1', 40_00, 5, { pinnedSplitId: 'usd' })],
  });
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 'hkd', amountCents: 40_00 }]);
});
it('falls back to oldest first when the pinned split belongs to the other direction', () => {
  const r = allocateSettlements({
    splits: [
      split('mine', 100_00, 1),
      split('theirs', 100_00, 1, { debtorId: 'tam', creditorId: 'alex' }),
    ],
    payments: [pay('p1', 30_00, 5, { pinnedSplitId: 'theirs' })],
  });
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 'mine', amountCents: 30_00 }]);
});
it('falls back to oldest first when the pinned split is already settled', () => {
  const r = allocateSettlements({
    splits: [split('s1', 50_00, 1), split('s2', 100_00, 2)],
    payments: [pay('p1', 50_00, 3), pay('p2', 40_00, 4, { pinnedSplitId: 's1' })],
  });
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 50_00 },
    { settlementId: 'p2', splitId: 's2', amountCents: 40_00 },
  ]);
});
it('ignores the informational settledCents on input', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1, { settledCents: 40_00 })],
    payments: [pay('p1', 100_00, 5)],
  });
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 's1', amountCents: 100_00 }]);
  expect(r.settledCents.get('s1')).toBe(100_00);
});
it('reports cleared totals per split across payments, including untouched splits', () => {
  const r = allocateSettlements({
    splits: [
      split('s1', 100_00, 1),
      split('s2', 100_00, 2),
      split('usd', 70_00, 3, { currency: 'USD' }),
    ],
    payments: [pay('p1', 30_00, 5), pay('p2', 70_00, 6)],
  });
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 30_00 },
    { settlementId: 'p2', splitId: 's1', amountCents: 70_00 },
  ]);
  expect(r.settledCents.get('s1')).toBe(100_00);
  expect(r.settledCents.get('s2')).toBe(0);
  expect(r.settledCents.get('usd')).toBe(0);
});
it('sums credit per currency across payments', () => {
  const r = allocateSettlements({
    splits: [],
    payments: [pay('p1', 30_00, 2), pay('p2', 20_00, 3), pay('p3', 70_00, 4, { currency: 'USD' })],
  });
  expect(r.allocations).toEqual([]);
  expect(r.settledCents.size).toBe(0);
  expect(r.creditCents.get('HKD')).toBe(50_00);
  expect(r.creditCents.get('USD')).toBe(70_00);
});
it('returns nothing for empty input', () => {
  const r = allocateSettlements({ splits: [], payments: [] });
  expect(r.allocations).toEqual([]);
  expect(r.settledCents.size).toBe(0);
  expect(r.creditCents.size).toBe(0);
});
it('leaves a zero-amount payment with no allocation and no credit', () => {
  const r = allocateSettlements({
    splits: [split('s1', 100_00, 1)],
    payments: [pay('p1', 0, 5)],
  });
  expect(r.allocations).toEqual([]);
  expect(r.settledCents.get('s1')).toBe(0);
  expect(r.creditCents.has('HKD')).toBe(false);
});
it('moves cleared money when an expense date changes, keeping the total', () => {
  const splits = [split('later', 100_00, 5), split('earlier', 100_00, 1)];
  const payment = pay('p1', 150_00, 3);

  const before = allocateSettlements({ splits, payments: [payment] });
  expect(before.settledCents.get('earlier')).toBe(100_00);
  expect(before.settledCents.get('later')).toBe(50_00);
  const totalBefore = [...before.settledCents.values()].reduce((sum, cents) => sum + cents, 0);

  const edited = splits.map((entry) =>
    entry.id === 'later' ? { ...entry, occurredAt: day(0) } : entry,
  );
  const after = allocateSettlements({ splits: edited, payments: [payment] });
  expect(after.settledCents.get('later')).toBe(100_00);
  expect(after.settledCents.get('earlier')).toBe(50_00);
  const totalAfter = [...after.settledCents.values()].reduce((sum, cents) => sum + cents, 0);

  expect(totalAfter).toBe(totalBefore);
});

it('never mutates its inputs', () => {
  const splits = [split('s2', 100_00, 2), split('s1', 100_00, 1)];
  const payments = [pay('p2', 120_00, 6), pay('p1', 80_00, 5)];
  const before = JSON.parse(JSON.stringify({ splits, payments }));

  splits.forEach((entry) => Object.freeze(entry));
  payments.forEach((entry) => Object.freeze(entry));
  const input: AllocationInput = { splits, payments };
  Object.freeze(input.splits);
  Object.freeze(input.payments);

  expect(() => allocateSettlements(input)).not.toThrow();
  expect(JSON.parse(JSON.stringify({ splits, payments }))).toEqual(before);
});
