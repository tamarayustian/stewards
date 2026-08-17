'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPairBalances } from '@/lib/balances';
import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { resolveInvitesForEmail } from '@/lib/invites';
import { createServerClient } from '@/lib/supabase';
import { addContact } from '@/lib/users';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function createExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const groupId = (formData.get('groupId') as string) || null;
  const rawAmount = formData.get('amount') as string;
  const note = (formData.get('note') as string)?.trim() || null;
  const payerId = (formData.get('paidById') as string) || user.id;

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

  await db.expense.create({
    data: {
      groupId,
      paidById: payerId,
      amount,
      currency: 'HKD',
      note,
      splits: { create: splits },
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/groups');
  if (groupId) {
    revalidatePath(`/groups/${groupId}`);
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

  revalidatePath('/groups');
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
  revalidatePath('/groups');
  if (expense.groupId) {
    revalidatePath(`/groups/${expense.groupId}`);
  }
}

// Marks the current user's share of an expense as repaid.
// Only the borrower (non-payer with an unsettled, non-zero split) can settle their own debt.
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
      paidById: { not: user.id },
      splits: { some: { userId: user.id, settledAt: null, amount: { gt: 0 } } },
      OR: [{ groupId: null }, { group: { deletedAt: null } }],
    },
    select: { groupId: true },
  });

  if (!expense) {
    return { error: 'Nothing to settle on this expense.' };
  }

  await db.expenseSplit.update({
    where: { expenseId_userId: { expenseId, userId: user.id } },
    data: { settledAt: new Date() },
  });

  revalidatePath('/dashboard');
  revalidatePath('/groups');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/groups/${expense.groupId}`);
  }
}

// Reverts a mistaken 'Mark paid': clears settledAt on the current user's split.
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
      paidById: { not: user.id },
      splits: { some: { userId: user.id, settledAt: { not: null }, amount: { gt: 0 } } },
      OR: [{ groupId: null }, { group: { deletedAt: null } }],
    },
    select: { groupId: true },
  });
  if (!expense) {
    return { error: 'Nothing to un-settle on this expense.' };
  }
  await db.expenseSplit.update({
    where: { expenseId_userId: { expenseId, userId: user.id } },
    data: { settledAt: null },
  });
  revalidatePath('/dashboard');
  revalidatePath('/groups');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/groups/${expense.groupId}`);
  }
}

// Marks every one of the current user's unsettled debts as repaid in one go.
export async function settleAll() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  await db.expenseSplit.updateMany({
    where: {
      userId: user.id,
      settledAt: null,
      amount: { gt: 0 },
      expense: {
        deletedAt: null,
        paidById: { not: user.id },
        OR: [{ groupId: null }, { group: { deletedAt: null } }],
      },
    },
    data: { settledAt: new Date() },
  });

  revalidatePath('/dashboard');
  revalidatePath('/groups');
  revalidatePath('/expenses');
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
  revalidatePath('/groups');
  if (expense.groupId) {
    revalidatePath(`/groups/${expense.groupId}`);
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

  revalidatePath('/groups');
  redirect(`/groups/${group.id}`);
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

  revalidatePath('/groups');
  revalidatePath(`/groups/${groupId}`);
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

  revalidatePath(`/groups/${groupId}`);
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
  revalidatePath('/balances');
  return {};
}

// Revalidates both the list page and the dynamic pair pages (pattern match revalidates all).
async function revalidateBalances() {
  revalidatePath('/balances');
  revalidatePath('/balances/[userId]');
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

  await revalidateBalances();
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
  await revalidateBalances();
  return {};
}

export async function updateCurrency(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const currency = formData.get('currency') as string;
  if (
    !currency ||
    !['HKD', 'USD', 'CNY', 'JPY', 'TWD', 'GBP', 'EUR', 'SGD', 'AUD', 'KRW', 'IDR', 'PHP'].includes(
      currency,
    )
  ) {
    return { error: 'Invalid currency.' };
  }

  await db.user.update({ where: { id: user.id }, data: { currency } });
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/balances');
  return { success: true };
}
