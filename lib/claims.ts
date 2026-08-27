export interface GhostIdentity {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchesIdentity(
  identity: { email?: string | null; name: string; phone?: string | null },
  ghost: GhostIdentity,
): boolean {
  if (identity.email && ghost.email && ghost.email === identity.email) return true;
  if (normalizeName(ghost.name) === normalizeName(identity.name)) return true;
  if (identity.phone && ghost.phone && ghost.phone === identity.phone) return true;
  return false;
}

export function filterUnclaimed(
  ghosts: GhostIdentity[],
  existingPairs: Set<string>,
): GhostIdentity[] {
  return ghosts.filter((g) => !existingPairs.has(g.id));
}

export interface GhostSplitLike {
  id: string;
  expenseId: string;
  amount: string | number;
}

export interface OccupiedSplitLike {
  expenseId: string;
  id: string;
}

export type SplitDecision =
  | { kind: 'repoint'; splitId: string }
  | { kind: 'sum'; splitId: string; expenseId: string; amount: string | number };

export function decideSplitTransfers(
  ghostSplits: GhostSplitLike[],
  occupied: OccupiedSplitLike[],
): SplitDecision[] {
  const byExpense = new Map(occupied.map((o) => [o.expenseId, o]));
  return ghostSplits.map((split) => {
    if (byExpense.has(split.expenseId)) {
      return { kind: 'sum', splitId: split.id, expenseId: split.expenseId, amount: split.amount };
    }
    return { kind: 'repoint', splitId: split.id };
  });
}

export type RepointDecision = { kind: 'repoint'; id: string } | { kind: 'drop'; id: string };

export function decideRepoints(
  items: { id: string; key: string }[],
  occupiedKeys: Set<string>,
): RepointDecision[] {
  return items.map((item) =>
    occupiedKeys.has(item.key) ? { kind: 'drop', id: item.id } : { kind: 'repoint', id: item.id },
  );
}
