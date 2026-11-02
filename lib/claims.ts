import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';

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

export async function mergeGhostIntoUser(
  tx: Prisma.TransactionClient,
  ghostId: string,
  targetUserId: string,
): Promise<void> {
  await tx.expense.updateMany({
    where: { paidById: ghostId },
    data: { paidById: targetUserId },
  });

  const ghostSplits = await tx.expenseSplit.findMany({
    where: { userId: ghostId },
    select: { id: true, expenseId: true, amount: true },
  });
  if (ghostSplits.length > 0) {
    const targetSplits = await tx.expenseSplit.findMany({
      where: { userId: targetUserId, expenseId: { in: ghostSplits.map((s) => s.expenseId) } },
      select: { id: true, expenseId: true },
    });
    const decisions = decideSplitTransfers(
      ghostSplits.map((s) => ({ id: s.id, expenseId: s.expenseId, amount: s.amount.toString() })),
      targetSplits,
    );
    for (let i = 0; i < ghostSplits.length; i++) {
      const decision = decisions[i];
      if (decision.kind === 'sum') {
        const target = targetSplits.find((t) => t.expenseId === ghostSplits[i].expenseId)!;
        await tx.expenseSplit.update({
          where: { id: target.id },
          data: { amount: { increment: ghostSplits[i].amount } },
        });
        await tx.expenseSplit.delete({ where: { id: ghostSplits[i].id } });
      } else {
        await tx.expenseSplit.update({
          where: { id: ghostSplits[i].id },
          data: { userId: targetUserId },
        });
      }
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

  await tx.user.delete({ where: { id: ghostId } });
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
