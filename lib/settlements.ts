import { Prisma } from '@/lib/generated/prisma/client';
import {
  allocateSettlements,
  type AllocationPayment,
  type AllocationSplit,
} from '@/lib/settlement-allocation';

/**
 * Pair-scoped rebuild of the settlement ledger.
 *
 * Balances are never frozen: an expense or payment can be edited or deleted at
 * any time, then this service recomputes the pair from the surviving records.
 * Allocations and `ExpenseSplit.settledAmount` are projections — rebuildable
 * caches, never user-facing truth.
 *
 * Scope rules:
 * - One call handles one unordered pair, both directions.
 * - It only reads or writes splits and settlements that belong to that pair.
 * - Money crosses the DB boundary as `Decimal(12,2)` and the engine boundary as
 *   integer minor units; the conversion happens exactly once at each edge.
 */

export type AllocationSplitSource = {
  id: string;
  /** The debtor (the person whose share this is). */
  userId: string;
  amount: Prisma.Decimal;
  settledAmount: Prisma.Decimal;
  expense: {
    /** The creditor (the person who paid). */
    paidById: string;
    currency: string;
    createdAt: Date;
  };
};

export type AllocationPaymentSource = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: Prisma.Decimal;
  currency: string;
  occurredAt: Date;
  createdAt: Date;
};

/** Stable key for an unordered pair of users. */
export function settlementPairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/**
 * Decimal string / Decimal to integer minor units. `Decimal#mul` is exact, so
 * `0.10` becomes `10` without the `10.000000000000002` drift of `Number(x) * 100`.
 */
function toCents(value: Prisma.Decimal | string | number): number {
  return Number(new Prisma.Decimal(value).mul(100).toFixed(0));
}

function toMoney(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}

export function toAllocationSplit(row: AllocationSplitSource): AllocationSplit {
  return {
    id: row.id,
    debtorId: row.userId,
    creditorId: row.expense.paidById,
    amountCents: toCents(row.amount),
    settledCents: toCents(row.settledAmount),
    currency: row.expense.currency,
    // Splits carry no timestamp of their own; the expense date is the ledger
    // date, and the engine breaks same-date ties by id.
    occurredAt: row.expense.createdAt,
    createdAt: row.expense.createdAt,
  };
}

export function toAllocationPayment(row: AllocationPaymentSource): AllocationPayment {
  return {
    id: row.id,
    fromId: row.fromUserId,
    toId: row.toUserId,
    amountCents: toCents(row.amount),
    currency: row.currency,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    // The schema has no pin column. Pinning is expressed by creating a
    // settlement whose amount equals the target split's outstanding balance;
    // oldest-first allocation then lands it within the pair.
    pinnedSplitId: null,
  };
}

/**
 * `settledAt` is set only while a split is fully settled. A rebuild keeps the
 * original timestamp when the split stays settled and clears it otherwise, so a
 * reversed payment reopens the split.
 */
export function nextSettledAt(input: {
  current: Date | null;
  settledCents: number;
  amountCents: number;
  now: Date;
}): Date | null {
  if (input.settledCents < input.amountCents) return null;
  return input.current ?? input.now;
}

const activeExpenseWhere = {
  deletedAt: null,
  OR: [{ groupId: null }, { group: { deletedAt: null } }],
} satisfies Prisma.ExpenseWhereInput;

const pairSplitSelect = {
  id: true,
  userId: true,
  amount: true,
  settledAmount: true,
  settledAt: true,
  expense: {
    select: {
      paidById: true,
      currency: true,
      createdAt: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.ExpenseSplitSelect;

const pairSettlementSelect = {
  id: true,
  fromUserId: true,
  toUserId: true,
  amount: true,
  currency: true,
  occurredAt: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.SettlementSelect;

type PairSplitRow = Prisma.ExpenseSplitGetPayload<{ select: typeof pairSplitSelect }>;
type PairSettlementRow = Prisma.SettlementGetPayload<{ select: typeof pairSettlementSelect }>;

/**
 * Rebuild one pair's allocations and settled-amount cache inside the caller's
 * transaction. The caller is responsible for committing; any throw rolls the
 * whole pair back.
 *
 * Returns unapplied payment remainder per currency ("credit in your favor").
 */
export async function rebuildPairAllocations(
  tx: Prisma.TransactionClient,
  userAId: string,
  userBId: string,
): Promise<{ creditByCurrency: Map<string, number> }> {
  // A self-pair cannot hold a payment (no self-payment invariant), so there is
  // nothing to project. Guard before touching rows.
  if (userAId === userBId) return { creditByCurrency: new Map() };

  // Serialise concurrent rebuilds that share either user. Every split row
  // belonging to either user is locked, so a rebuild of (a, b) and one of
  // (a, c) queue behind each other instead of racing. `ORDER BY id` gives all
  // callers the same lock order, which rules out a cycle between them.
  await tx.$queryRaw`
    SELECT id FROM "ExpenseSplit"
    WHERE "userId" IN (${userAId}, ${userBId})
    ORDER BY id
    FOR UPDATE
  `;

  const [splitRows, settlementRows] = (await Promise.all([
    tx.expenseSplit.findMany({
      where: {
        OR: [
          { userId: userAId, expense: { ...activeExpenseWhere, paidById: userBId } },
          { userId: userBId, expense: { ...activeExpenseWhere, paidById: userAId } },
        ],
      },
      select: pairSplitSelect,
    }),
    tx.settlement.findMany({
      where: {
        // Soft-deleted settlements are loaded too, so the rebuild can clear the
        // allocations they left behind. Only active rows feed the engine below.
        OR: [
          { fromUserId: userAId, toUserId: userBId },
          { fromUserId: userBId, toUserId: userAId },
        ],
      },
      select: pairSettlementSelect,
    }),
  ])) satisfies [PairSplitRow[], PairSettlementRow[]];

  const activeSettlements = settlementRows.filter((row) => row.deletedAt === null);

  const result = allocateSettlements({
    splits: splitRows.map(toAllocationSplit),
    payments: activeSettlements.map(toAllocationPayment),
  });

  // Replace this pair's allocations. Allocations are hard-deleted here and only
  // here; expenses and settlements themselves only soft-delete. The delete set
  // includes soft-deleted settlements so their allocations do not linger.
  await tx.settlementAllocation.deleteMany({
    where: { settlementId: { in: settlementRows.map((row) => row.id) } },
  });

  if (result.allocations.length > 0) {
    await tx.settlementAllocation.createMany({
      data: result.allocations.map(({ settlementId, splitId, amountCents }) => ({
        settlementId,
        splitId,
        amount: toMoney(amountCents),
      })),
    });
  }

  const now = new Date();
  for (const split of splitRows) {
    const amountCents = toCents(split.amount);
    // The engine never exceeds outstanding; clamp defensively so the
    // `0 <= settledAmount <= amount` invariant cannot be violated by a bug.
    const settledCents = Math.min(Math.max(result.settledCents.get(split.id) ?? 0, 0), amountCents);

    await tx.expenseSplit.update({
      where: { id: split.id },
      data: {
        settledAmount: toMoney(settledCents),
        settledAt: nextSettledAt({
          current: split.settledAt,
          settledCents,
          amountCents,
          now,
        }),
      },
    });
  }

  return { creditByCurrency: result.creditCents };
}
