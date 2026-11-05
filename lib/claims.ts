import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { affectedPairsForExpenses, mergeAffectedPairs } from '@/lib/settlement-pairs';
import { rebuildPairAllocations, toCents } from '@/lib/settlements';

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

/** Money as integer minor units, matching the ledger's internal representation. */
export type SplitTotals = {
  amountCents: number;
  settledCents: number;
  settledAt: Date | null;
};

/**
 * Totals for a split that absorbs another split of the same expense.
 *
 * The settled projection is summed rather than dropped: the absorbed share was
 * paid too, and the rebuild that follows re-derives the real allocation from the
 * surviving payments. `settledAt` survives only when the merged share ends fully
 * settled, so a part-paid merge never claims to be closed.
 */
export function mergeSplitTotals(target: SplitTotals, absorbed: SplitTotals): SplitTotals {
  const amountCents = target.amountCents + absorbed.amountCents;
  const settledCents = target.settledCents + absorbed.settledCents;
  return {
    amountCents,
    settledCents,
    settledAt: settledCents >= amountCents ? (target.settledAt ?? absorbed.settledAt) : null,
  };
}

export type GhostSettlementLike = { id: string; fromUserId: string; toUserId: string };

export type SettlementMergeDecision =
  | { kind: 'keep'; id: string }
  | { kind: 'repoint'; id: string; fromUserId: string; toUserId: string }
  | { kind: 'drop'; id: string };

/**
 * Payments that named the ghost now belong to the person claiming it, because
 * they are the same human. A payment that ends up between one user and themself
 * is not a transfer (no self-payment invariant) and is dropped.
 */
export function decideSettlementRepoints(
  settlements: GhostSettlementLike[],
  ghostId: string,
  targetUserId: string,
): SettlementMergeDecision[] {
  return settlements.map((settlement) => {
    const fromUserId = settlement.fromUserId === ghostId ? targetUserId : settlement.fromUserId;
    const toUserId = settlement.toUserId === ghostId ? targetUserId : settlement.toUserId;
    if (fromUserId === toUserId) return { kind: 'drop', id: settlement.id };
    if (fromUserId === settlement.fromUserId && toUserId === settlement.toUserId) {
      return { kind: 'keep', id: settlement.id };
    }
    return { kind: 'repoint', id: settlement.id, fromUserId, toUserId };
  });
}

/**
 * The pair each repointed payment now belongs to. A repointed payment can end up
 * holding nothing but unapplied credit (its old allocations were released with
 * the ghost's rows); the pair still has to be rebuilt so that credit can clear
 * the claimant's surviving splits instead of sitting unused. Kept payments
 * change no pair, and a dropped one has no counterparty by construction.
 */
export function settlementRepointPairs(decisions: SettlementMergeDecision[]): string[][] {
  return decisions.flatMap((decision) =>
    decision.kind === 'repoint' ? [[decision.fromUserId, decision.toUserId]] : [],
  );
}

function fromCents(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}

export async function mergeGhostIntoUser(
  tx: Prisma.TransactionClient,
  ghostId: string,
  targetUserId: string,
): Promise<void> {
  // Every expense the ghost touches can change a pair's ledger position: its
  // payer becomes the target, or its split moves to the target. Remember them
  // before the merge, then rebuild their pairs once the ghost is gone.
  const ghostPaidExpenses = await tx.expense.findMany({
    where: { paidById: ghostId },
    select: { id: true },
  });
  const affectedExpenseIds = new Set(ghostPaidExpenses.map((expense) => expense.id));

  await tx.expense.updateMany({
    where: { paidById: ghostId },
    data: { paidById: targetUserId },
  });

  const ghostSplits = await tx.expenseSplit.findMany({
    where: { userId: ghostId },
    select: {
      id: true,
      expenseId: true,
      amount: true,
      settledAmount: true,
      settledAt: true,
    },
  });
  if (ghostSplits.length > 0) {
    for (const split of ghostSplits) affectedExpenseIds.add(split.expenseId);

    const targetSplits = await tx.expenseSplit.findMany({
      where: { userId: targetUserId, expenseId: { in: ghostSplits.map((s) => s.expenseId) } },
      select: {
        id: true,
        expenseId: true,
        amount: true,
        settledAmount: true,
        settledAt: true,
      },
    });
    const decisions = decideSplitTransfers(
      ghostSplits.map((s) => ({ id: s.id, expenseId: s.expenseId, amount: s.amount.toString() })),
      targetSplits,
    );
    // Allocations restrict-delete their split, so the doomed splits' allocations
    // are released before the rows go; the rebuild re-creates what survives.
    const doomedSplitIds: string[] = [];
    for (let i = 0; i < ghostSplits.length; i++) {
      const decision = decisions[i];
      if (decision.kind === 'sum') {
        const target = targetSplits.find((t) => t.expenseId === ghostSplits[i].expenseId)!;
        const merged = mergeSplitTotals(
          {
            amountCents: toCents(target.amount),
            settledCents: toCents(target.settledAmount),
            settledAt: target.settledAt,
          },
          {
            amountCents: toCents(ghostSplits[i].amount),
            settledCents: toCents(ghostSplits[i].settledAmount),
            settledAt: ghostSplits[i].settledAt,
          },
        );
        await tx.expenseSplit.update({
          where: { id: target.id },
          data: {
            amount: fromCents(merged.amountCents),
            settledAmount: fromCents(merged.settledCents),
            settledAt: merged.settledAt,
          },
        });
        doomedSplitIds.push(ghostSplits[i].id);
      } else {
        await tx.expenseSplit.update({
          where: { id: ghostSplits[i].id },
          data: { userId: targetUserId },
        });
      }
    }
    if (doomedSplitIds.length > 0) {
      await tx.settlementAllocation.deleteMany({
        where: { splitId: { in: doomedSplitIds } },
      });
      await tx.expenseSplit.deleteMany({ where: { id: { in: doomedSplitIds } } });
    }
  }

  const ghostMemberships = await tx.groupMember.findMany({
    where: { userId: ghostId },
    select: { id: true, groupId: true },
  });
  if (ghostMemberships.length > 0) {
    const targetMemberships = await tx.groupMember.findMany({
      where: { userId: targetUserId, groupId: { in: ghostMemberships.map((m) => m.groupId) } },
      select: { groupId: true },
    });
    const occupied = new Set(targetMemberships.map((m) => m.groupId));
    const decisions = decideRepoints(
      ghostMemberships.map((m) => ({ id: m.id, key: m.groupId })),
      occupied,
    );
    for (const decision of decisions) {
      if (decision.kind === 'drop') {
        await tx.groupMember.delete({ where: { id: decision.id } });
      } else {
        await tx.groupMember.update({ where: { id: decision.id }, data: { userId: targetUserId } });
      }
    }
  }

  const ownerContacts = await tx.contact.findMany({
    where: { ownerId: ghostId },
    select: { id: true, contactId: true },
  });
  if (ownerContacts.length > 0) {
    const targetHas = await tx.contact.findMany({
      where: { ownerId: targetUserId, contactId: { in: ownerContacts.map((c) => c.contactId) } },
      select: { contactId: true },
    });
    const decisions = decideRepoints(
      ownerContacts.map((c) => ({ id: c.id, key: c.contactId })),
      new Set(targetHas.map((c) => c.contactId)),
    );
    for (const decision of decisions) {
      if (decision.kind === 'drop') {
        await tx.contact.delete({ where: { id: decision.id } });
      } else {
        await tx.contact.update({ where: { id: decision.id }, data: { ownerId: targetUserId } });
      }
    }
  }

  const contactLinks = await tx.contact.findMany({
    where: { contactId: ghostId },
    select: { id: true, ownerId: true },
  });
  if (contactLinks.length > 0) {
    const targetLinked = await tx.contact.findMany({
      where: { contactId: targetUserId, ownerId: { in: contactLinks.map((c) => c.ownerId) } },
      select: { ownerId: true },
    });
    const decisions = decideRepoints(
      contactLinks.map((c) => ({ id: c.id, key: c.ownerId })),
      new Set(targetLinked.map((c) => c.ownerId)),
    );
    for (const decision of decisions) {
      if (decision.kind === 'drop') {
        await tx.contact.delete({ where: { id: decision.id } });
      } else {
        await tx.contact.update({ where: { id: decision.id }, data: { contactId: targetUserId } });
      }
    }
  }

  // Payments naming the ghost belong to the same human, so they move to the
  // target. Both sides landing on the target would be a self-payment, which the
  // ledger does not allow; those are soft-deleted with their allocations.
  const ghostSettlements = await tx.settlement.findMany({
    where: { OR: [{ fromUserId: ghostId }, { toUserId: ghostId }] },
    select: { id: true, fromUserId: true, toUserId: true },
  });
  const settlementDecisions = decideSettlementRepoints(ghostSettlements, ghostId, targetUserId);
  for (const decision of settlementDecisions) {
    if (decision.kind === 'drop') {
      await tx.settlementAllocation.deleteMany({ where: { settlementId: decision.id } });
      await tx.settlement.update({
        where: { id: decision.id },
        data: { deletedAt: new Date() },
      });
    } else if (decision.kind === 'repoint') {
      await tx.settlement.update({
        where: { id: decision.id },
        data: { fromUserId: decision.fromUserId, toUserId: decision.toUserId },
      });
    }
  }

  await tx.user.delete({ where: { id: ghostId } });

  // Rebuild every pair whose shape this merge changed, in the same transaction:
  // the settled-amount projection and its allocations must never lag the merge.
  // Repointed payments contribute their new pair even when the ghost shared no
  // expense with that counterparty — otherwise pure credit never gets applied.
  const touchedExpenses = await tx.expense.findMany({
    where: { id: { in: [...affectedExpenseIds] } },
    select: { paidById: true, splits: { select: { userId: true } } },
  });
  const pairs = mergeAffectedPairs(
    affectedPairsForExpenses(touchedExpenses),
    settlementRepointPairs(settlementDecisions),
  );
  for (const [userAId, userBId] of pairs) {
    await rebuildPairAllocations(tx, userAId, userBId);
  }
}

export async function syncPendingClaims(userId: string): Promise<void> {
  // All three reads are independent; batching them keeps login to one round trip.
  const [user, ghosts, existing] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    }),
    db.user.findMany({
      where: { id: { not: userId }, isRegistered: false, deletedAt: null },
      select: { id: true, email: true, name: true, phone: true },
    }),
    db.userClaim.findMany({
      where: { userId },
      select: { ghostId: true },
    }),
  ]);
  if (!user || ghosts.length === 0) return;

  const ghostRows: GhostIdentity[] = ghosts;
  const existingPairs = new Set(existing.map((e) => e.ghostId));

  const matches = filterUnclaimed(
    ghostRows.filter((g) => matchesIdentity({ email: user.email, name: user.name, phone: user.phone }, g)),
    existingPairs,
  );

  if (matches.length > 0) {
    await db.userClaim.createMany({
      data: matches.map((g) => ({ userId, ghostId: g.id })),
    });
  }
}

export async function countPendingClaims(userId: string): Promise<number> {
  return db.userClaim.count({ where: { userId, status: 'pending' } });
}

export type PendingClaimRow = {
  claimId: string;
  ghostName: string;
  adderName: string | null;
  sharedExpenseCount: number;
};

export async function listPendingClaims(userId: string): Promise<PendingClaimRow[]> {
  const claims = await db.userClaim.findMany({
    where: { userId, status: 'pending' },
    include: { ghost: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (claims.length === 0) return [];

  const ghostIds = claims.map((claim) => claim.ghost.id);

  // Three grouped reads for all claims instead of 3 queries per claim.
  const [adders, paidCounts, splitCounts] = await Promise.all([
    db.contact.findMany({
      where: { contactId: { in: ghostIds } },
      include: { owner: { select: { name: true } } },
    }),
    db.expense.groupBy({
      by: ['paidById'],
      where: { paidById: { in: ghostIds }, deletedAt: null },
      _count: { _all: true },
    }),
    db.expenseSplit.groupBy({
      by: ['userId'],
      where: { userId: { in: ghostIds }, expense: { deletedAt: null } },
      _count: { _all: true },
    }),
  ]);

  const adderByGhost = new Map<string, string>();
  for (const contact of adders) {
    if (!adderByGhost.has(contact.contactId)) adderByGhost.set(contact.contactId, contact.owner.name);
  }
  const paidByGhost = new Map(paidCounts.map((row) => [row.paidById, row._count._all]));
  const splitByGhost = new Map(splitCounts.map((row) => [row.userId, row._count._all]));

  return claims.map((claim) => {
    const ghostId = claim.ghost.id;
    return {
      claimId: claim.id,
      ghostName: claim.ghost.name,
      adderName: adderByGhost.get(ghostId) ?? null,
      sharedExpenseCount: (paidByGhost.get(ghostId) ?? 0) + (splitByGhost.get(ghostId) ?? 0),
    };
  });
}
