/**
 * Fill `Expense.occurredAt` for expenses created before the date-only column
 * existed.
 *
 * `occurredAt` is a calendar day (`@db.Date`), so existing rows are seeded from
 * the UTC day of their `createdAt`: the value never shifts with the viewer's
 * timezone, and expenses created on the same UTC day compare equal.
 *
 * The column stays nullable in Postgres so `prisma db push` can add it to a
 * populated table. That makes this script the only writer for existing rows, and
 * its exit code the only signal that any are still missing.
 *
 * Idempotent: it selects only `occurredAt: null`, so a second run finds nothing.
 *
 * Usage:
 *   pnpm db:backfill-expense-dates --dry-run   print the batch plan, write nothing
 *   pnpm db:backfill-expense-dates             backfill in batches of 100
 */

import 'dotenv/config';

import db from '../lib/db';
import { expenseDateKey, parseExpenseDate } from '../lib/expense-date';

const BATCH_SIZE = 100;

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const rows = await db.expense.findMany({
    where: { occurredAt: null },
    select: { id: true, createdAt: true },
    orderBy: { id: 'asc' },
  });

  if (dryRun) {
    console.log('Dry run — no rows will be written.');
  }
  console.log(`Found ${rows.length} expense(s) without a date.`);

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const batchNumber = start / BATCH_SIZE + 1;

    if (!dryRun) {
      // Each row has its own date, so `updateMany` cannot express this batch.
      await db.$transaction(
        (tx) =>
          Promise.all(
            batch.map((row) =>
              tx.expense.update({
                where: { id: row.id },
                // A canonical `YYYY-MM-DD` key parsed back is UTC midnight, so the
                // date rule stays defined only in `lib/expense-date`.
                data: { occurredAt: parseExpenseDate(expenseDateKey(row.createdAt))! },
              }),
            ),
          ),
        { timeout: 60_000 },
      );
    }

    console.log(
      `${dryRun ? 'Would write' : 'Wrote'} batch ${batchNumber}: ${batch.length} expense date(s).`,
    );
  }

  if (dryRun) {
    const remaining = await db.expense.count({ where: { occurredAt: null } });
    console.log(`${remaining} null expense dates (dry run — nothing written)`);
    return;
  }

  console.log(`backfilled ${rows.length} expense dates`);

  const remaining = await db.expense.count({ where: { occurredAt: null } });
  console.log(`${remaining} null expense dates`);
  if (remaining > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
