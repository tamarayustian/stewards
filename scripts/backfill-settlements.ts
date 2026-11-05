/**
 * Backfill synthetic settlements for splits that were marked settled before the
 * settlement ledger existed.
 *
 * Those rows carry `settledAt` with `settledAmount = 0`. The rebuild derives
 * cleared amounts from active payments alone, so rebuilding first would silently
 * reopen them. This script creates the missing payment (and its allocation) and
 * writes the projection directly — it deliberately does NOT rebuild. Reconcile is
 * the only thing that rebuilds.
 *
 * Idempotent: every synthetic row carries `requestId = backfill:<splitId>`
 * (unique) and `note = 'Backfilled'`, so a second run plans nothing.
 *
 * Usage:
 *   pnpm db:backfill --dry-run   print the plan, write nothing
 *   pnpm db:backfill             write the plan in batches
 */

import 'dotenv/config';

import db from '../lib/db';
import {
  BACKFILL_NOTE,
  planBackfill,
  type BackfillCandidate,
  type BackfillSkipReason,
} from '../lib/ledger-maintenance';
import { toCents } from '../lib/settlements';
import { Prisma as PrismaValue } from '../lib/generated/prisma/browser';

const BATCH_SIZE = 50;

/** Integer minor units → `Decimal(12,2)` without floating point. */
function toMoney(cents: number) {
  return new PrismaValue.Decimal(cents).div(100);
}

/** Presentation only: `1234` → `12.34`. Integer math, no floats. */
function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

async function loadLegacySplits() {
  const rows = await db.expenseSplit.findMany({
    where: { settledAt: { not: null }, settledAmount: 0 },
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
    orderBy: [{ settledAt: 'asc' }, { id: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    debtorId: row.userId,
    creditorId: row.expense.paidById,
    amountCents: toCents(row.amount),
    settledCents: toCents(row.settledAmount),
    settledAt: row.settledAt,
    currency: row.expense.currency,
    inactiveExpense: row.expense.deletedAt !== null || row.expense.group?.deletedAt != null,
  }));
}

async function writeBatch(batch: BackfillCandidate[]): Promise<void> {
  // One transaction per batch: a failure leaves a whole batch unwritten, and the
  // unique requestId makes a rerun pick up exactly where this one stopped.
  await db.$transaction(
    async (tx) => {
      for (const candidate of batch) {
        const amount = toMoney(candidate.amountCents);

        const settlement = await tx.settlement.create({
          data: {
            fromUserId: candidate.fromUserId,
            toUserId: candidate.toUserId,
            amount,
            currency: candidate.currency,
            occurredAt: candidate.occurredAt,
            note: BACKFILL_NOTE,
            createdById: null,
            requestId: candidate.requestId,
            // Pin the payment to the split it preserves. Without the pin a later
            // rebuild would re-apply it oldest-first and could clear a different
            // (older, still-open) share of the same pair and currency, reopening
            // the legacy row it was created for.
            pinnedSplitId: candidate.splitId,
            allocations: {
              create: { splitId: candidate.splitId, amount },
            },
          },
          select: { id: true },
        });

        await tx.expenseSplit.update({
          where: { id: candidate.splitId },
          data: { settledAmount: amount },
        });

        await tx.ledgerEvent.create({
          data: {
            actorId: null,
            action: 'settlement.backfilled',
            entity: 'Settlement',
            entityId: settlement.id,
            after: {
              amount: amount.toFixed(2),
              currency: candidate.currency,
              occurredAt: candidate.occurredAt.toISOString(),
              note: BACKFILL_NOTE,
              fromUserId: candidate.fromUserId,
              toUserId: candidate.toUserId,
              pinnedSplitId: candidate.splitId,
              requestId: candidate.requestId,
              splitId: candidate.splitId,
            },
          },
        });
      }
    },
    { timeout: 60_000 },
  );
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const [splits, backfillRows] = await Promise.all([
    loadLegacySplits(),
    db.settlement.findMany({
      where: { requestId: { startsWith: 'backfill:' } },
      select: { requestId: true },
    }),
  ]);

  const backfilledRequestIds = new Set(
    backfillRows.map((row) => row.requestId).filter((id): id is string => id !== null),
  );
  const plan = planBackfill(splits, backfilledRequestIds);

  if (dryRun) {
    console.log('Dry run — no rows will be written.');
  }
  console.log(
    `Planned ${plan.candidates.length} synthetic settlement(s) from ${splits.length} legacy settled split(s).`,
  );

  for (const candidate of plan.candidates) {
    console.log(
      `  ${candidate.requestId}  ${candidate.fromUserId} -> ${candidate.toUserId}  ${candidate.currency} ${formatCents(candidate.amountCents)}  (settled ${candidate.occurredAt.toISOString()})`,
    );
  }

  if (plan.skipped.length > 0) {
    const counts = new Map<BackfillSkipReason, number>();
    for (const skip of plan.skipped) counts.set(skip.reason, (counts.get(skip.reason) ?? 0) + 1);
    const summary = [...counts.entries()]
      .map(([reason, count]) => `${reason}=${count}`)
      .sort()
      .join(', ');
    console.log(`Skipped ${plan.skipped.length}: ${summary}`);
  }

  if (dryRun || plan.candidates.length === 0) {
    console.log(dryRun ? 'Dry run complete.' : 'Nothing to do.');
    return;
  }

  let written = 0;
  for (let start = 0; start < plan.candidates.length; start += BATCH_SIZE) {
    const batch = plan.candidates.slice(start, start + BATCH_SIZE);
    await writeBatch(batch);
    written += batch.length;
    console.log(`Wrote ${written}/${plan.candidates.length} settlement(s).`);
  }

  console.log(`Backfill complete: ${written} settlement(s), allocation(s), and LedgerEvent(s).`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
