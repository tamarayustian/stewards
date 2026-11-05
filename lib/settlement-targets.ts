/**
 * `settleAll` grouping.
 *
 * The viewer's outstanding splits are collected as targets, then folded into one
 * payment per creditor and currency: a settlement is a transfer between two
 * people in one currency, so neither axis may be mixed. Groups are emitted in a
 * deterministic order (creditor id, then currency) and each group's splits are
 * oldest-first, matching the ledger's allocation order.
 *
 * Pure and client-safe: no Prisma import, integer minor units only.
 */

export type SettleTarget = {
  creditorId: string;
  currency: string;
  splitId: string;
  amountCents: number;
  /** Ledger date: the expense date, as used by the allocation engine. */
  occurredAt: Date;
  /** Tie-break for same-date expenses. */
  createdAt: Date;
};

export type SettleTargetGroup = {
  creditorId: string;
  currency: string;
  amountCents: number;
  /** Oldest-first, for auditability and deterministic allocation. */
  splitIds: string[];
};

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Oldest-first: expense date, then creation time, then id — same as the engine. */
const compareTargets = (a: SettleTarget, b: SettleTarget): number =>
  a.occurredAt.getTime() - b.occurredAt.getTime() ||
  a.createdAt.getTime() - b.createdAt.getTime() ||
  compareText(a.splitId, b.splitId);

/**
 * Folds outstanding splits into one target per creditor and currency. Rows with
 * no outstanding (`amountCents <= 0`) are dropped, so a group can never carry a
 * zero payment.
 */
export function groupSettleAllTargets(rows: SettleTarget[]): SettleTargetGroup[] {
  const byPair = new Map<string, { creditorId: string; currency: string; rows: SettleTarget[] }>();

  for (const row of rows) {
    if (row.amountCents <= 0) continue;
    // Ids are UUIDs, so a NUL separator cannot collide with a real key.
    const key = `${row.creditorId}\u0000${row.currency}`;
    const existing = byPair.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      byPair.set(key, { creditorId: row.creditorId, currency: row.currency, rows: [row] });
    }
  }

  return [...byPair.values()]
    .sort((a, b) => compareText(a.creditorId, b.creditorId) || compareText(a.currency, b.currency))
    .map(({ creditorId, currency, rows: groupRows }) => {
      const ordered = [...groupRows].sort(compareTargets);
      return {
        creditorId,
        currency,
        amountCents: ordered.reduce((sum, row) => sum + row.amountCents, 0),
        splitIds: ordered.map((row) => row.splitId),
      };
    });
}
