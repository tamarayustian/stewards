'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
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
    const unique = [...new Set([user.id, ...participantIds])];
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

  const result = await addContact({ name, email });
  return result;
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
