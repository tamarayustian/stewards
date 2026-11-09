export interface SplitParticipant {
  id: string;
  name: string;
}

export function totalCents(value: string): number {
  const n = Math.round(parseFloat(value || '0') * 100);
  return Number.isFinite(n) ? n : 0;
}

export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Even split over the people who owe the payer. The payer's own share is always
// 0.00 — they covered the expense — so the whole total lands on everyone else.
// Any rounding remainder lands on the last person.
//
// `payerId` must be one of `participants`. The caller resolves which payer will
// actually be in effect (see `resolvePayer` in the expense form) so the row
// rendered read-only as the payer is the same row excluded here and from the
// submitted `amount_*` fields.
export function equalAmounts(
  participants: SplitParticipant[],
  amount: string,
  payerId: string,
): Record<string, string> {
  const total = totalCents(amount);
  const out: Record<string, string> = {};
  for (const p of participants) out[p.id] = '0.00';

  const borrowers = participants.filter((p) => p.id !== payerId);
  if (borrowers.length === 0) return out;

  const base = Math.floor(total / borrowers.length);
  const remainder = total - base * borrowers.length;

  borrowers.forEach((p, index) => {
    out[p.id] = formatAmount(index === borrowers.length - 1 ? base + remainder : base);
  });
  return out;
}
