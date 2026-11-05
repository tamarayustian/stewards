/**
 * Rebuild every pair's ledger projections, then assert the invariants.
 *
 * Reconcile is the only script that rebuilds: the backfill writes its synthetic
 * rows directly and stops, precisely so a rebuild cannot zero legacy settled
 * splits before they are represented as payments. Running this afterwards is what
 * proves the pair allocations and `ExpenseSplit.settledAmount` caches agree with
 * the surviving settlement rows.
 *
 * It never repairs beyond the rebuild itself: on an invariant violation it prints
 * the pair key and the failing invariant, then exits non-zero.
 *
 * It also refuses to run at all while the backfill has pending candidates: a
 * rebuild would clear the legacy settled state that the backfill exists to
 * preserve, and the backfill could no longer find those splits afterwards.
 */

import 'dotenv/config';

import db from '../lib/db';
import {
  BACKFILL_NOTE,
  backfillBlockerMessage,
  ledgerPairs,
  settlementViolations,
  splitViolations,
} from '../lib/ledger-maintenance';
import { rebuildPairAllocations, settlementPairKey, toCents } from '../lib/settlements';

async function reconcilePair(userAId: string, userBId: string): Promise<string[]> {
  return db.$transaction(
    async (tx) => {
      await rebuildPairAllocations(tx, userAId, userBId);

      const [splitRows, settlementRows] = await Promise.all([
        tx.expenseSplit.findMany({
          where: {
            // Every expense state: the rebuild also resets the cache of splits on
            // deleted expenses and deleted groups, and those must pass too.
            OR: [
              { userId: userAId, expense: { paidById: userBId } },
              { userId: userBId, expense: { paidById: userAId } },
            ],
          },
          select: { id: true, amount: true, settledAmount: true, settledAt: true },
        }),
        tx.settlement.findMany({
          where: {
            OR: [
              { fromUserId: userAId, toUserId: userBId },
              { fromUserId: userBId, toUserId: userAId },
            ],
          },
          select: {
            id: true,
            amount: true,
            deletedAt: true,
            allocations: { select: { amount: true } },
          },
        }),
      ]);

      const violations: string[] = [];

      for (const split of splitRows) {
        violations.push(
          ...splitViolations({
            id: split.id,
            amountCents: toCents(split.amount),
            settledCents: toCents(split.settledAmount),
            settledAt: split.settledAt,
          }),
        );
      }

      for (const settlement of settlementRows) {
        violations.push(
          ...settlementViolations({
            id: settlement.id,
            amountCents: toCents(settlement.amount),
            allocatedCents: settlement.allocations.reduce(
              (sum, allocation) => sum + toCents(allocation.amount),
              0,
            ),
            deleted: settlement.deletedAt !== null,
            allocationCount: settlement.allocations.length,
          }),
        );
      }

      return violations;
    },
    { timeout: 60_000 },
  );
}

async function main(): Promise<void> {
  const [splitRows, settlementRows, backfillRows] = await Promise.all([
    db.expenseSplit.findMany({
      select: {
        id: true,
        userId: true,
        amount: true,
        settledAmount: true,
        settledAt: true,
        expense: {
          select: {
            paidById: true,
            currency: true,
            deletedAt: true,
            group: { select: { deletedAt: true } },
          },
        },
      },
    }),
    db.settlement.findMany({ select: { fromUserId: true, toUserId: true } }),
    db.settlement.findMany({
      where: { requestId: { startsWith: 'backfill:' }, note: BACKFILL_NOTE },
      select: { requestId: true },
    }),
  ]);

  // Guard: never rebuild while a legacy settled split is still waiting for its
  // synthetic payment. The rebuild would clear `settledAt`/`settledAmount` on it,
  // the backfill queries could no longer find it, and this run would report
  // success while destroying the very state it was meant to verify.
  const blocker = backfillBlockerMessage(
    splitRows.map((row) => ({
      id: row.id,
      debtorId: row.userId,
      creditorId: row.expense.paidById,
      amountCents: toCents(row.amount),
      settledCents: toCents(row.settledAmount),
      settledAt: row.settledAt,
      currency: row.expense.currency,
      inactiveExpense: row.expense.deletedAt !== null || row.expense.group?.deletedAt != null,
    })),
    new Set(backfillRows.map((row) => row.requestId).filter((id): id is string => id !== null)),
  );

  if (blocker !== null) {
    console.error(blocker);
    process.exitCode = 1;
    return;
  }

  const pairs = ledgerPairs(
    splitRows.map((row) => ({ debtorId: row.userId, creditorId: row.expense.paidById })),
    settlementRows.map((row) => ({ fromId: row.fromUserId, toId: row.toUserId })),
  );

  let failures = 0;

  for (const [userAId, userBId] of pairs) {
    const key = settlementPairKey(userAId, userBId);
    try {
      const violations = await reconcilePair(userAId, userBId);
      if (violations.length > 0) {
        failures += 1;
        console.error(`FAIL pair ${key}`);
        for (const violation of violations) console.error(`  ${violation}`);
      }
    } catch (error) {
      failures += 1;
      console.error(`FAIL pair ${key}`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`Reconciled ${pairs.length} pair(s); ${failures} failing.`);

  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Reconcile failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
