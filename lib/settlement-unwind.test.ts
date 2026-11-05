import { describe, expect, it } from 'vitest';

import { planSettlementUnwind } from './settlement-unwind';

const settlement = (id: string, amountCents: number) => ({ id, amountCents });
const allocation = (settlementId: string, splitId: string) => ({ settlementId, splitId });

describe('planSettlementUnwind', () => {
  it('closes the payment that funded the tapped split', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('p1', 's1')],
      settlements: [settlement('p1', 100_00)],
    });

    expect(plan).toEqual({
      settlementIds: ['p1'],
      settlementsClosed: 1,
      allocationsReleased: 1,
      otherSplitsReleased: 0,
      amountReversedCents: 100_00,
    });
  });

  it('reports the other shares the same payment was funding', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('p1', 's1'), allocation('p1', 's2'), allocation('p1', 's3')],
      settlements: [settlement('p1', 300_00)],
    });

    expect(plan.otherSplitsReleased).toBe(2);
    expect(plan.allocationsReleased).toBe(1);
  });

  it('closes every payment behind the split and sums their amounts', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('p2', 's1'), allocation('p1', 's1'), allocation('p1', 's9')],
      settlements: [settlement('p2', 40_00), settlement('p1', 60_50)],
    });

    expect(plan.settlementIds).toEqual(['p1', 'p2']);
    expect(plan.settlementsClosed).toBe(2);
    expect(plan.allocationsReleased).toBe(2);
    expect(plan.otherSplitsReleased).toBe(1);
    expect(plan.amountReversedCents).toBe(100_50);
  });

  it('does not close a payment that funds other splits but not the tapped one', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('p1', 's1'), allocation('p2', 's2')],
      settlements: [settlement('p1', 100_00), settlement('p2', 50_00)],
    });

    expect(plan.settlementIds).toEqual(['p1']);
    expect(plan.amountReversedCents).toBe(100_00);
    expect(plan.otherSplitsReleased).toBe(0);
  });

  it('ignores allocations whose settlement is no longer active', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('gone', 's1'), allocation('p1', 's1')],
      settlements: [settlement('p1', 100_00)],
    });

    expect(plan.settlementIds).toEqual(['p1']);
    expect(plan.allocationsReleased).toBe(1);
    expect(plan.otherSplitsReleased).toBe(0);
  });

  it('counts a split funded by two closed payments once', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [
        allocation('p1', 's1'),
        allocation('p1', 's2'),
        allocation('p2', 's1'),
        allocation('p2', 's2'),
      ],
      settlements: [settlement('p1', 40_00), settlement('p2', 60_00)],
    });

    expect(plan.otherSplitsReleased).toBe(1);
    expect(plan.settlementsClosed).toBe(2);
    expect(plan.allocationsReleased).toBe(2);
  });

  it('returns an empty plan when nothing funds the split', () => {
    const plan = planSettlementUnwind({
      splitId: 's1',
      allocations: [allocation('p1', 's2')],
      settlements: [settlement('p1', 100_00)],
    });

    expect(plan).toEqual({
      settlementIds: [],
      settlementsClosed: 0,
      allocationsReleased: 0,
      otherSplitsReleased: 0,
      amountReversedCents: 0,
    });
  });
});
