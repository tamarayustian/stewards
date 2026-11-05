'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { getPairBalances } from '@/lib/balances';
import {
  countPendingClaims,
  listPendingClaims,
  mergeGhostIntoUser,
  syncPendingClaims,
} from '@/lib/claims';
import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { resolveInvitesForEmail } from '@/lib/invites';
import { createServerClient } from '@/lib/supabase';
import { type Currency, validateCurrency } from '@/lib/currencies';
import { fetchExchangeRate } from '@/lib/rates';
import { validatePhone } from '@/lib/auth-validation';
import { addContact } from '@/lib/users';
import { EMAIL_RE } from '@/lib/auth-validation';
import { validateSettlementEditInput, validateSettlementInput } from '@/lib/settlement-input';
import { groupSettleAllTargets, type SettleTarget } from '@/lib/settlement-targets';
import { rebuildPairAllocations, toCents } from '@/lib/settlements';

export async function createExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const groupId = (formData.get('groupId') as string) || null;
  const rawAmount = formData.get('amount') as string;
  const note = (formData.get('note') as string)?.trim() || null;
  const payerId = (formData.get('paidById') as string) || user.id;
  const currencyCode = validateCurrency(formData.get('currency') as string) ?? 'HKD';
  const rawRate = formData.get('rate') as string | null;
  const rawRateCurrency = formData.get('rateCurrency') as string | null;

  const amount = new Prisma.Decimal(rawAmount || '0');
  if (amount.lte(0)) {
    return { error: 'Enter an amount greater than zero.' };
  }
  const totalCents = amount.times(100);

  let finalParticipantIds: string[];

  if (groupId) {
    const group = await db.group.findFirst({
      where: { id: groupId, deletedAt: null, members: { some: { userId: user.id } } },
      include: { members: { select: { userId: true } } },
    });
    if (!group) {
      return { error: 'Group not found.' };
    }
    // Group expenses split among the whole group.
    finalParticipantIds = group.members.map((m) => m.userId);
  } else {
    const participantIds = (formData.getAll('participantId') as string[]).filter(Boolean);
    const contactLinks = await db.contact.findMany({
      where: { ownerId: user.id, contactId: { in: participantIds } },
      select: { contactId: true },
    });
    const contactIds = new Set(contactLinks.map((c) => c.contactId));
    const unique = [user.id, ...participantIds.filter((id) => contactIds.has(id))];
    if (unique.length < 2) {
      return { error: 'Choose at least one person to split with.' };
    }
    const validUsers = await db.user.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    finalParticipantIds = validUsers.map((u) => u.id);
  }

  if (!finalParticipantIds.includes(payerId)) {
    return { error: 'The payer must be part of this expense.' };
  }

  // Read each participant's amount; splits must match the total exactly.
  const splits: { userId: string; amount: Prisma.Decimal }[] = [];
  let splitCents = new Prisma.Decimal(0);

  for (const participantId of finalParticipantIds) {
    const raw = (formData.get(`amount_${participantId}`) as string) || '';
    const cents = new Prisma.Decimal(raw || '0').times(100).round();
    if (cents.lt(0)) {
      return { error: 'Splits cannot be negative.' };
    }
    splits.push({ userId: participantId, amount: cents.dividedBy(100) });
    splitCents = splitCents.plus(cents);
  }

  if (!splitCents.equals(totalCents)) {
    return {
      error: `Splits must add up to ${totalCents.dividedBy(100).toFixed(2)}. They total ${splitCents
        .dividedBy(100)
        .toFixed(2)}.`,
    };
  }

  const viewer = await db.user.findUnique({
    where: { id: user.id },
    select: { currency: true },
  });
  const homeCurrency = (viewer?.currency ?? 'HKD') as string;

  let rate: string | null = null;
  let rateCurrency: string | null = null;

  if (currencyCode !== homeCurrency) {
    if (rawRate) {
      rate = rawRate;
      rateCurrency = rawRateCurrency;
    } else {
      const rateResult = await fetchExchangeRate(currencyCode, homeCurrency as Currency);
      if ('error' in rateResult) {
        return { error: rateResult.error };
      }
      rate = String(rateResult.rate);
      rateCurrency = currencyCode;
    }
  }

  await db.expense.create({
    data: {
      groupId,
      paidById: payerId,
      amount,
      currency: currencyCode,
      rate,
      rateCurrency,
      note,
      splits: { create: splits },
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  if (groupId) {
    revalidatePath(`/people/${groupId}`);
  }

  redirect('/dashboard');
}

export async function addFriend(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const name = (formData.get('name') as string) ?? '';
  const email = (formData.get('email') as string) || null;
  const phone = (formData.get('phone') as string) || null;

  const result = await addContact({ ownerId: user.id, name, email, phone });
  revalidatePath('/people');
  return result;
}

export async function removeContact(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const contactId = formData.get('contactId') as string;

  const result = await db.contact.deleteMany({
    where: { ownerId: user.id, contactId },
  });

  if (result.count === 0) {
    return { error: 'Contact not found.' };
  }

  revalidatePath('/people');
}

export async function deleteGroup(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const groupId = formData.get('groupId') as string;

  const group = await db.group.findFirst({
    where: { id: groupId, deletedAt: null, members: { some: { userId: user.id } } },
    include: {
      expenses: {
        where: { deletedAt: null, splits: { some: { settledAt: null } } },
        select: { id: true },
      },
    },
  });

  if (!group) {
    return { error: 'Group not found.' };
  }

  if (group.expenses.length > 0) {
    return { error: 'Settle all expenses before deleting this group.' };
  }

  await db.group.update({
    where: { id: groupId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/people');
  revalidatePath('/dashboard');
}

export async function deleteExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const expenseId = formData.get('expenseId') as string;

  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      OR: [{ paidById: user.id }, { splits: { some: { userId: user.id } } }],
    },
    select: { groupId: true },
  });

  if (!expense) {
    return { error: 'Expense not found.' };
  }

  await db.expense.update({
    where: { id: expenseId },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
  }
}

// Marks one share of an expense as repaid by recording a settlement pinned to
// that split. The borrower settles their own share; the payer can record that a
// borrower paid them by naming that borrower's split.
export async function settleExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const expenseId = formData.get('expenseId') as string;

  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      // The payer or a participant may act on this expense.
      OR: [{ paidById: user.id }, { splits: { some: { userId: user.id } } }],
      AND: [{ OR: [{ groupId: null }, { group: { deletedAt: null } }] }],
    },
    select: {
      groupId: true,
      paidById: true,
      currency: true,
      splits: { select: { id: true, userId: true, amount: true, settledAmount: true } },
    },
  });

  if (!expense) {
    return { error: 'Nothing to settle on this expense.' };
  }

  // Determine which split to settle: borrower settles their own, payer settles
  // the borrower's (named by `splitUserId`).
  const splitUserId =
    expense.paidById === user.id ? (formData.get('splitUserId') as string) || user.id : user.id;

  const split = expense.splits.find((row) => row.userId === splitUserId);
  // Paying yourself is not a payment, so the payer's own share is never a target.
  if (!split || splitUserId === expense.paidById) {
    return { error: 'Nothing to settle on this expense.' };
  }

  // Outstanding is projected from the ledger, never re-derived from `settledAt`.
  const outstanding = split.amount.minus(split.settledAmount);
  if (outstanding.lte(0)) {
    return { error: 'Nothing to settle on this expense.' };
  }

  await db.$transaction(async (tx) => {
    await writeSettlement(tx, {
      fromUserId: splitUserId,
      toUserId: expense.paidById,
      amountCents: toCents(outstanding),
      currency: expense.currency,
      occurredAt: new Date(),
      note: null,
      // Pin the payment so it clears the tapped share, not the oldest one.
      pinnedSplitId: split.id,
      groupId: expense.groupId,
      requestId: null,
      actorId: user.id,
    });
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
  }
}

// Reverts a mistaken 'Mark paid' by removing the payments that funded the share.
// A payment may have covered several shares, so this reopens all of them.
export async function unsettleExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const expenseId = formData.get('expenseId') as string;
  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      OR: [{ paidById: user.id }, { splits: { some: { userId: user.id } } }],
      AND: [{ OR: [{ groupId: null }, { group: { deletedAt: null } }] }],
    },
    select: {
      groupId: true,
      paidById: true,
      splits: { select: { id: true, userId: true } },
    },
  });
  if (!expense) {
    return { error: 'Nothing to un-settle on this expense.' };
  }

  // Determine which split to un-settle: borrower own, payer the borrower's.
  const splitUserId =
    expense.paidById === user.id ? (formData.get('splitUserId') as string) || user.id : user.id;

  const split = expense.splits.find((row) => row.userId === splitUserId);
  if (!split) {
    return { error: 'Nothing to un-settle on this expense.' };
  }

  const reopened = await db.$transaction(async (tx) => {
    const allocations = await tx.settlementAllocation.findMany({
      where: { splitId: split.id, settlement: { deletedAt: null } },
      select: { settlementId: true },
    });

    const fundingIds = [...new Set(allocations.map((row) => row.settlementId))];
    const settlements =
      fundingIds.length > 0
        ? await tx.settlement.findMany({
            where: { id: { in: fundingIds }, deletedAt: null },
            select: {
              id: true,
              amount: true,
              currency: true,
              occurredAt: true,
              note: true,
              fromUserId: true,
              toUserId: true,
              pinnedSplitId: true,
              deletedAt: true,
            },
          })
        : [];

    const deletedIds = new Set(settlements.map((settlement) => settlement.id));
    const released = allocations.filter((row) => deletedIds.has(row.settlementId)).length;
    if (released === 0) {
      return 0;
    }

    const deletedAt = new Date();
    for (const settlement of settlements) {
      const deleted = await tx.settlement.update({
        where: { id: settlement.id },
        data: { deletedAt },
      });

      await tx.ledgerEvent.create({
        data: {
          actorId: user.id,
          action: 'settlement.deleted',
          entity: 'Settlement',
          entityId: settlement.id,
          before: settlementSnapshot(settlement),
          after: settlementSnapshot(deleted),
        },
      });
    }

    await rebuildPairAllocations(tx, expense.paidById, splitUserId);
    return released;
  });

  if (reopened === 0) {
    return { error: 'Nothing to un-settle on this expense.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/people');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
  }

  return { ok: true, reopened };
}

// Marks every one of the current user's outstanding debts as repaid in one go:
// one settlement per creditor and currency, allocated oldest-first.
export async function settleAll() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const splits = await db.expenseSplit.findMany({
    where: {
      userId: user.id,
      amount: { gt: 0 },
      expense: {
        deletedAt: null,
        paidById: { not: user.id },
        OR: [{ groupId: null }, { group: { deletedAt: null } }],
      },
    },
    select: {
      id: true,
      amount: true,
      settledAmount: true,
      expense: { select: { paidById: true, currency: true, createdAt: true } },
    },
  });

  const targets: SettleTarget[] = [];
  for (const split of splits) {
    const amountCents = toCents(split.amount.minus(split.settledAmount));
    if (amountCents <= 0) continue;
    targets.push({
      creditorId: split.expense.paidById,
      currency: split.expense.currency,
      splitId: split.id,
      amountCents,
      // Splits carry no date of their own; the expense is the ledger date.
      occurredAt: split.expense.createdAt,
      createdAt: split.expense.createdAt,
    });
  }

  const groups = groupSettleAllTargets(targets);
  const occurredAt = new Date();

  await db.$transaction(async (tx) => {
    for (const group of groups) {
      await writeSettlement(tx, {
        fromUserId: user.id,
        toUserId: group.creditorId,
        amountCents: group.amountCents,
        currency: group.currency,
        occurredAt,
        note: null,
        // No pin: the whole group allocates oldest-first across the pair.
        pinnedSplitId: null,
        // A group can span several groups and direct expenses, so it is not
        // attributable to a single group.
        groupId: null,
        requestId: null,
        actorId: user.id,
      });
    }
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  revalidatePath('/expenses');
}

// --- Settlement ledger -------------------------------------------------------
// A settlement is a payment between two people. Allocations and
// `ExpenseSplit.settledAmount` are projections: every mutation below rebuilds
// the affected pair inside its own transaction, then appends a `LedgerEvent`.
// `LedgerEvent` is audit-only and never participates in balance math.

type SettlementSnapshotRow = {
  amount: Prisma.Decimal;
  currency: string;
  occurredAt: Date;
  note: string | null;
  fromUserId: string;
  toUserId: string;
  pinnedSplitId: string | null;
  deletedAt: Date | null;
};

/** JSON-safe audit snapshot; dates are ISO strings and money is exact text. */
function settlementSnapshot(row: SettlementSnapshotRow): Prisma.InputJsonObject {
  return {
    amount: row.amount.toFixed(2),
    currency: row.currency,
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    pinnedSplitId: row.pinnedSplitId,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

/**
 * Refreshes both parties' pair pages (the path is viewer-scoped, so each side
 * has its own) plus the group page when the settlement belongs to one.
 */
function revalidateSettlementPaths(userIds: string[], groupId: string | null) {
  revalidatePath('/dashboard');
  revalidatePath('/expenses');
  revalidatePath('/people');
  for (const userId of new Set(userIds)) {
    revalidatePath(`/people/${userId}`);
  }
  if (groupId) {
    revalidatePath(`/people/${groupId}`);
  }
}

/** Prisma's unique-constraint code; used for idempotent `requestId` retries. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

type WriteSettlementInput = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  note: string | null;
  /** Split this payment clears first, when still eligible. */
  pinnedSplitId: string | null;
  groupId: string | null;
  requestId: string | null;
  actorId: string;
};

/**
 * The single write path for a payment: insert, rebuild the pair, audit.
 *
 * `amountCents` is the minor-unit boundary; `Decimal(12,2)` is built exactly
 * once here. The caller owns the transaction, so the insert, the rebuilt
 * projection and the audit row commit or roll back together.
 */
async function writeSettlement(tx: Prisma.TransactionClient, input: WriteSettlementInput) {
  const settlement = await tx.settlement.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      amount: new Prisma.Decimal(input.amountCents).div(100),
      currency: input.currency,
      occurredAt: input.occurredAt,
      note: input.note,
      requestId: input.requestId,
      pinnedSplitId: input.pinnedSplitId,
      groupId: input.groupId,
      createdById: input.actorId,
    },
  });

  await rebuildPairAllocations(tx, input.fromUserId, input.toUserId);

  await tx.ledgerEvent.create({
    data: {
      actorId: input.actorId,
      action: 'settlement.created',
      entity: 'Settlement',
      entityId: settlement.id,
      after: settlementSnapshot(settlement),
    },
  });

  return settlement;
}

/**
 * Records a payment the current user made to someone else.
 *
 * `amountCents` is the validated minor-unit boundary; `Decimal(12,2)` is built
 * exactly once by `writeSettlement`. A repeated `requestId` is a successful
 * no-op, so a double-submitted form cannot create a second payment.
 */
export async function recordSettlement(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const input = validateSettlementInput(formData, user.id);
  if ('error' in input) {
    return input;
  }

  if (input.requestId) {
    const existing = await db.settlement.findUnique({
      where: { requestId: input.requestId },
      select: { id: true },
    });
    if (existing) {
      return { ok: true };
    }
  }

  const recipient = await db.user.findFirst({
    where: { id: input.toId, deletedAt: null },
    select: { id: true },
  });
  if (!recipient) {
    return { error: 'Person not found.' };
  }

  // The pin targets one split so "mark this expense paid" clears it first; the
  // engine falls back to oldest-first when the pin is no longer eligible.
  if (input.splitId) {
    const split = await db.expenseSplit.findFirst({
      where: {
        id: input.splitId,
        userId: user.id,
        expense: {
          paidById: input.toId,
          currency: input.currency,
          deletedAt: null,
          OR: [{ groupId: null }, { group: { deletedAt: null } }],
        },
      },
      select: { id: true },
    });
    if (!split) {
      return { error: 'Expense not found.' };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await writeSettlement(tx, {
        fromUserId: user.id,
        toUserId: input.toId,
        amountCents: input.amountCents,
        currency: input.currency,
        occurredAt: input.occurredAt,
        note: input.note,
        pinnedSplitId: input.splitId,
        groupId: null,
        requestId: input.requestId,
        actorId: user.id,
      });
    });
  } catch (error) {
    // A concurrent retry may have won the `requestId` race. Only treat that as
    // success when the requested settlement really exists: any other unique
    // violation rolled the payment back and must surface as an error.
    if (input.requestId && isUniqueViolation(error)) {
      const existing = await db.settlement.findUnique({
        where: { requestId: input.requestId },
        select: { id: true },
      });
      if (existing) {
        return { ok: true };
      }
    }
    throw error;
  }

  revalidateSettlementPaths([user.id, input.toId], null);
  return { ok: true };
}

/**
 * Edits `amount`, `occurredAt`, and `note`. The parties and currency are fixed
 * for the life of a settlement: attempts to change them are rejected rather
 * than silently ignored.
 */
export async function editSettlement(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settlementId = (formData.get('settlementId') as string) || '';
  if (!settlementId) {
    return { error: 'Settlement not found.' };
  }

  const settlement = await db.settlement.findFirst({
    where: {
      id: settlementId,
      deletedAt: null,
      OR: [{ fromUserId: user.id }, { toUserId: user.id }],
    },
  });
  if (!settlement) {
    return { error: 'Settlement not found.' };
  }

  const fromUserId = ((formData.get('fromUserId') as string) || '').trim();
  const toUserId = ((formData.get('toUserId') as string) || '').trim();
  const currency = ((formData.get('currency') as string) || '').trim();

  if (fromUserId && fromUserId !== settlement.fromUserId) {
    return { error: "You can't change who paid this settlement." };
  }
  if (toUserId && toUserId !== settlement.toUserId) {
    return { error: "You can't change who received this settlement." };
  }
  if (currency && currency.toUpperCase() !== settlement.currency) {
    return { error: "You can't change the currency of this settlement." };
  }

  const input = validateSettlementEditInput(formData);
  if ('error' in input) {
    return input;
  }

  const amount = new Prisma.Decimal(input.amountCents).div(100);

  await db.$transaction(async (tx) => {
    const updated = await tx.settlement.update({
      where: { id: settlement.id },
      data: { amount, occurredAt: input.occurredAt, note: input.note },
    });

    await rebuildPairAllocations(tx, settlement.fromUserId, settlement.toUserId);

    await tx.ledgerEvent.create({
      data: {
        actorId: user.id,
        action: 'settlement.updated',
        entity: 'Settlement',
        entityId: settlement.id,
        before: settlementSnapshot(settlement),
        after: settlementSnapshot(updated),
      },
    });
  });

  revalidateSettlementPaths([settlement.fromUserId, settlement.toUserId], settlement.groupId);
  return { ok: true };
}

/** Soft-deletes a settlement, which reopens exactly the shares it covered. */
export async function deleteSettlement(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settlementId = (formData.get('settlementId') as string) || '';
  if (!settlementId) {
    return { error: 'Settlement not found.' };
  }

  const settlement = await db.settlement.findFirst({
    where: {
      id: settlementId,
      deletedAt: null,
      OR: [{ fromUserId: user.id }, { toUserId: user.id }],
    },
  });
  if (!settlement) {
    return { error: 'Settlement not found.' };
  }

  await db.$transaction(async (tx) => {
    const deleted = await tx.settlement.update({
      where: { id: settlement.id },
      data: { deletedAt: new Date() },
    });

    await rebuildPairAllocations(tx, settlement.fromUserId, settlement.toUserId);

    await tx.ledgerEvent.create({
      data: {
        actorId: user.id,
        action: 'settlement.deleted',
        entity: 'Settlement',
        entityId: settlement.id,
        before: settlementSnapshot(settlement),
        after: settlementSnapshot(deleted),
      },
    });
  });

  revalidateSettlementPaths([settlement.fromUserId, settlement.toUserId], settlement.groupId);
  return { ok: true };
}

export async function editExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const expenseId = formData.get('expenseId') as string;
  const rawAmount = formData.get('amount') as string;
  const note = (formData.get('note') as string)?.trim() || null;
  const payerId = (formData.get('paidById') as string) || user.id;

  const amount = new Prisma.Decimal(rawAmount || '0');
  if (amount.lte(0)) {
    return { error: 'Enter an amount greater than zero.' };
  }
  const totalCents = amount.times(100);

  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      OR: [{ paidById: user.id }, { splits: { some: { userId: user.id } } }],
    },
    include: { splits: { select: { userId: true } } },
  });

  if (!expense) {
    return { error: 'Expense not found.' };
  }

  // TODO: participants are intentionally locked to the expense's original split
  // set for now. Future: allow adding/dropping people here and re-balancing the
  // remaining splits (mirrors createExpense's group/direct participant logic).
  const finalParticipantIds = expense.splits.map((s) => s.userId);

  if (!finalParticipantIds.includes(payerId)) {
    return { error: 'The payer must be part of this expense.' };
  }

  // Read each participant's amount; splits must match the total exactly.
  const splits: { userId: string; amount: Prisma.Decimal }[] = [];
  let splitCents = new Prisma.Decimal(0);

  for (const participantId of finalParticipantIds) {
    const raw = (formData.get(`amount_${participantId}`) as string) || '';
    const cents = new Prisma.Decimal(raw || '0').times(100).round();
    if (cents.lt(0)) {
      return { error: 'Splits cannot be negative.' };
    }
    splits.push({ userId: participantId, amount: cents.dividedBy(100) });
    splitCents = splitCents.plus(cents);
  }

  if (!splitCents.equals(totalCents)) {
    return {
      error: `Splits must add up to ${totalCents.dividedBy(100).toFixed(2)}. They total ${splitCents
        .dividedBy(100)
        .toFixed(2)}.`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expenseId },
      data: { paidById: payerId, amount, note },
    });
    for (const split of splits) {
      await tx.expenseSplit.upsert({
        where: { expenseId_userId: { expenseId, userId: split.userId } },
        create: { expenseId, userId: split.userId, amount: split.amount },
        update: { amount: split.amount },
      });
    }
    // Defensive: participants are locked above, so this is normally a no-op.
    await tx.expenseSplit.deleteMany({
      where: { expenseId, userId: { notIn: finalParticipantIds } },
    });
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
  }

  redirect('/dashboard');
}

export async function createGroup(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string)?.trim() ?? '';
  const description = (formData.get('description') as string)?.trim() || null;

  if (!name) {
    return { error: 'Enter a group name.' };
  }

  const group = await db.group.create({
    data: {
      name,
      description,
      members: { create: { userId: user.id } },
    },
  });

  revalidatePath('/people');
  redirect(`/people/${group.id}`);
}

export async function inviteToGroup(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const groupId = formData.get('groupId') as string;
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();

  if (!groupId) return { error: 'Group not found.' };

  const group = await db.group.findFirst({
    where: { id: groupId, deletedAt: null, members: { some: { userId: user.id } } },
    select: { id: true },
  });
  if (!group) {
    return { error: 'Group not found.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email.' };
  }

  if (email === user.email) {
    return { error: "You can't invite yourself." };
  }

  const existingMember = await db.groupMember.findFirst({
    where: { groupId, user: { email, deletedAt: null } },
    select: { id: true },
  });
  if (existingMember) {
    return { error: 'Already a member of this group.' };
  }

  const existingInvite = await db.groupInvite.findFirst({
    where: { groupId, email },
    select: { id: true },
  });
  if (existingInvite) {
    return { error: 'Already invited.' };
  }

  await db.groupInvite.create({
    data: { groupId, email, inviterId: user.id },
  });

  await resolveInvitesForEmail(email);

  revalidatePath('/people');
  revalidatePath(`/people/${groupId}`);
}

export async function cancelInvite(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const groupId = formData.get('groupId') as string;
  const inviteId = formData.get('inviteId') as string;

  if (!groupId || !inviteId) return { error: 'Invite not found.' };

  const group = await db.group.findFirst({
    where: { id: groupId, deletedAt: null, members: { some: { userId: user.id } } },
    select: { id: true },
  });
  if (!group) {
    return { error: 'Group not found.' };
  }

  const result = await db.groupInvite.deleteMany({
    where: { id: inviteId, groupId, status: 'pending' },
  });
  if (result.count === 0) {
    return { error: 'Invite not found.' };
  }

  revalidatePath(`/people/${groupId}`);
}

export async function dismissGroupNotices(_prev: unknown, _formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.email) return {};

  await db.groupInvite.updateMany({
    where: { email: user.email, status: 'joined', noticeSeenAt: null },
    data: { noticeSeenAt: new Date() },
  });

  revalidatePath('/dashboard');
  return {};
}

export async function dismissFriendNotices(_prevState: unknown, _formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await db.notice.updateMany({
    where: { userId: user.id, type: 'friend_joined', readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath('/dashboard');
  return {};
}

export async function sendReminder(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const toId = (formData.get('toId') as string) || '';
  if (!toId) {
    return { error: 'Missing recipient.' };
  }
  if (toId === user.id) {
    return { error: "You can't remind yourself." };
  }

  const recipient = await db.user.findFirst({
    where: { id: toId, deletedAt: null, isRegistered: true },
    select: { id: true },
  });
  if (!recipient) {
    return { error: 'User not found.' };
  }

  const pair = (await getPairBalances(user.id)).find((p) => p.counterparty.id === toId);
  if (!pair || pair.amountOwedToMe.isZero()) {
    return { error: "There's nothing to settle with this person." };
  }

  await db.reminder.create({ data: { fromId: user.id, toId } });
  revalidatePath('/people');
  return {};
}

// Revalidates both the list page and the dynamic person pages (pattern match revalidates all).
async function revalidatePeople() {
  revalidatePath('/people');
  revalidatePath('/people/[id]', 'page');
}

export async function markRemindersRead(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const fromId = (formData.get('fromId') as string) || null;

  await db.reminder.updateMany({
    where: {
      toId: user.id,
      readAt: null,
      ...(fromId ? { fromId } : {}),
    },
    data: { readAt: new Date() },
  });

  await revalidatePeople();
  return {};
}

export async function updateContactPhone(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const userId = (formData.get('userId') as string) || '';
  const phone = ((formData.get('phone') as string) || '').trim();
  if (!userId) {
    return { error: 'Missing user.' };
  }
  if (!phone.startsWith('+')) {
    return { error: 'Enter a valid phone number.' };
  }

  const contact = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!contact) {
    return { error: 'User not found.' };
  }

  const hasPair = (await getPairBalances(user.id)).some((p) => p.counterparty.id === userId);
  if (!hasPair) {
    return { error: "You don't have any balances with this person." };
  }

  await db.user.update({ where: { id: userId }, data: { phone } });
  await revalidatePeople();
  return {};
}

export async function updateCurrency(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const currency = formData.get('currency') as string;
  if (!currency || !validateCurrency(currency)) {
    return { error: 'Invalid currency.' };
  }

  await db.user.update({ where: { id: user.id }, data: { currency } });
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/people');
  return { success: true };
}

export async function updateProfile(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const name = ((formData.get('name') as string) ?? '').trim();
  const countryCode = formData.get('countryCode') as string;
  const phoneRaw = formData.get('phone') as string;

  if (!name) {
    return { error: 'Name is required.' };
  }

  const phoneResult = validatePhone(countryCode, phoneRaw);
  if ('error' in phoneResult) {
    return { error: phoneResult.error };
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, phone: phoneResult.fullPhone },
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateEmail(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();
  const currentPassword = formData.get('currentPassword') as string;

  if (!email) {
    return { error: 'Email is required.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (!currentPassword) {
    return { error: 'Enter your current password to confirm.' };
  }

  // Verify current password by attempting sign-in
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) {
    return { error: 'Incorrect password.' };
  }

  // Update email in Supabase Auth (sends confirmation link)
  const { error: updateError } = await supabase.auth.updateUser({ email });
  if (updateError) {
    return { error: updateError.message };
  }

  // TODO: DB update races with Supabase confirmation flow — if user never confirms,
  // Supabase Auth keeps the old email while our DB has the new one. Acceptable for
  // MVP; revisit with a confirmation callback route before launch.
  // Update email in our DB
  await db.user.update({
    where: { id: user.id },
    data: { email },
  });

  revalidatePath('/settings');
  return { success: true };
}

export async function updatePassword(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword) {
    return { error: 'Enter your current password.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters.' };
  }
  if (currentPassword === newPassword) {
    return { error: 'New password must be different from current password.' };
  }

  // Verify current password
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) {
    return { error: 'Incorrect password.' };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 3;

export async function submitFeedback(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const type = formData.get('type') as string;
  const message = (formData.get('message') as string)?.trim();
  const email = (formData.get('email') as string)?.trim() || null;

  if (!type || !['bug', 'feature', 'feedback'].includes(type)) {
    return { error: 'Please select a feedback type.' };
  }
  if (!message) {
    return { error: 'Please enter a message.' };
  }

  const imageFiles: File[] = [];
  for (let i = 0; i < MAX_IMAGES; i++) {
    const file = formData.get(`image_${i}`) as File | null;
    if (file && file.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { error: `Invalid file type: ${file.name}. Only PNG, JPG, and WebP are allowed.` };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { error: `${file.name} exceeds 5MB limit.` };
      }
      imageFiles.push(file);
    }
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const imageUrls: string[] = [];
  for (const file of imageFiles) {
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('feedback-images')
      .upload(path, buffer, { contentType: file.type });
    if (uploadError) {
      return { error: `Failed to upload ${file.name}: ${uploadError.message}` };
    }
    const { data: urlData } = supabase.storage.from('feedback-images').getPublicUrl(path);
    imageUrls.push(urlData.publicUrl);
  }

  await db.feedback.create({
    data: {
      userId: user.id,
      type,
      message,
      email,
      images: imageUrls,
    },
  });

  return { success: true };
}

export async function claimGhost(_prevState: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const claimId = formData.get('claimId');
  if (typeof claimId !== 'string' || !claimId) return { error: 'Claim not found.' };

  const claim = await db.userClaim.findFirst({
    where: { id: claimId, userId: user.id, status: 'pending' },
    select: { id: true, ghostId: true },
  });
  if (!claim) return { error: 'Claim not found.' };

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });

  await db.$transaction(async (tx) => {
    const adders = await tx.contact.findMany({
      where: { contactId: claim.ghostId },
      select: { ownerId: true },
    });
    await tx.userClaim.update({
      where: { id: claim.id },
      data: { status: 'claimed', resolvedAt: new Date() },
    });
    await mergeGhostIntoUser(tx, claim.ghostId, user.id);
    if (adders.length > 0) {
      await tx.notice.createMany({
        data: adders.map((adder) => ({
          userId: adder.ownerId,
          type: 'friend_joined',
          friendName: me?.name ?? 'Someone',
          friendId: user.id,
        })),
      });
    }
  });

  revalidatePath('/auth/claim');
  revalidatePath('/dashboard');
  return {};
}

export async function declineGhost(_prevState: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const claimId = formData.get('claimId');
  if (typeof claimId !== 'string' || !claimId) return { error: 'Claim not found.' };

  const result = await db.userClaim.updateMany({
    where: { id: claimId, userId: user.id, status: 'pending' },
    data: { status: 'declined', resolvedAt: new Date() },
  });
  if (result.count === 0) return { error: 'Claim not found.' };

  revalidatePath('/auth/claim');
  return {};
}
