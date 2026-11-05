import { describe, expect, it } from 'vitest'
import { allocateSettlements } from './settlement-allocation'

const day = (n: number) => new Date(2026, 0, n)
const split = (id: string, amountCents: number, n: number, extra = {}) => ({
  id, debtorId: 'alex', creditorId: 'tam', amountCents, currency: 'HKD',
  occurredAt: day(n), createdAt: day(n), ...extra,
})
const pay = (id: string, amountCents: number, n: number, extra = {}) => ({
  id, fromId: 'alex', toId: 'tam', amountCents, currency: 'HKD',
  occurredAt: day(n), createdAt: day(n), ...extra,
})

it('allocates oldest first', () => {
  const r = allocateSettlements({ splits: [split('s2', 100_00, 2), split('s1', 100_00, 1)], payments: [pay('p1', 150_00, 5)] })
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 100_00 },
    { settlementId: 'p1', splitId: 's2', amountCents: 50_00 },
  ])
})
it('honours a pinned split first', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1), split('s2', 100_00, 2)], payments: [pay('p1', 60_00, 5, { pinnedSplitId: 's2' })] })
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 's2', amountCents: 60_00 }])
})
it('falls back to oldest first when the pin is not eligible', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1)], payments: [pay('p1', 50_00, 5, { pinnedSplitId: 'missing' })] })
  expect(r.allocations).toEqual([{ settlementId: 'p1', splitId: 's1', amountCents: 50_00 }])
})
it('keeps excess as credit', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1)], payments: [pay('p1', 150_00, 5)] })
  expect(r.creditCents.get('HKD')).toBe(50_00)
})
it('never allocates across currencies', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1, { currency: 'USD' })], payments: [pay('p1', 100_00, 5)] })
  expect(r.allocations).toEqual([])
  expect(r.creditCents.get('HKD')).toBe(100_00)
})
it('only allocates the matching direction', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1, { debtorId: 'tam', creditorId: 'alex' })], payments: [pay('p1', 100_00, 5)] })
  expect(r.allocations).toEqual([])
})
it('caps at outstanding across multiple payments', () => {
  const r = allocateSettlements({ splits: [split('s1', 100_00, 1)], payments: [pay('p1', 80_00, 2), pay('p2', 80_00, 3)] })
  expect(r.allocations).toEqual([
    { settlementId: 'p1', splitId: 's1', amountCents: 80_00 },
    { settlementId: 'p2', splitId: 's1', amountCents: 20_00 },
  ])
  expect(r.creditCents.get('HKD')).toBe(60_00)
})
it('is deterministic for same-date ties by createdAt then id', () => {
  const a = split('a', 10_00, 1, { createdAt: day(1) })
  const b = split('b', 10_00, 1, { createdAt: day(1) })
  const r = allocateSettlements({ splits: [b, a], payments: [pay('p', 10_00, 2)] })
  expect(r.allocations[0].splitId).toBe('a')
})
