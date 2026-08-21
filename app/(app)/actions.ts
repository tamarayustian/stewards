'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPairBalances } from '@/lib/balances';
import db from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { resolveInvitesForEmail } from '@/lib/invites';
import { createServerClient } from '@/lib/supabase';
import { type Currency, validateCurrency } from '@/lib/currencies';
import { fetchExchangeRate } from '@/lib/rates';
import { validatePhone } from '@/lib/auth-validation';
import { addContact } from '@/lib/users';
import { EMAIL_RE } from '@/lib/auth-validation';

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
      OR: [
        // Borrower can settle their own split (they paid the payer)
        {
          paidById: { not: user.id },
          splits: { some: { userId: user.id, settledAt: null, amount: { gt: 0 } } },
        },
        // Payer can settle a borrower's split (they received payment)
        {
          paidById: user.id,
          splits: { some: { userId: { not: user.id }, settledAt: null, amount: { gt: 0 } } },
        },
      ],
      AND: [{ OR: [{ groupId: null }, { group: { deletedAt: null } }] }],
    },
    select: { groupId: true, paidById: true },
  });

  if (!expense) {
    return { error: 'Nothing to settle on this expense.' };
  }

  // Determine which split to settle: borrower settles their own, payer settles the other's
  const splitUserId = expense.paidById === user.id
    ? (formData.get('splitUserId') as string) || user.id
    : user.id;

  await db.expenseSplit.update({
    where: { expenseId_userId: { expenseId, userId: splitUserId } },
    data: { settledAt: new Date() },
  });

  revalidatePath('/dashboard');
  revalidatePath('/people');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
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
      OR: [
        // Borrower can un-settle their own split
        {
          paidById: { not: user.id },
          splits: { some: { userId: user.id, settledAt: { not: null }, amount: { gt: 0 } } },
        },
        // Payer can un-settle a borrower's split
        {
          paidById: user.id,
          splits: { some: { userId: { not: user.id }, settledAt: { not: null }, amount: { gt: 0 } } },
        },
      ],
      AND: [{ OR: [{ groupId: null }, { group: { deletedAt: null } }] }],
    },
    select: { groupId: true, paidById: true },
  });
  if (!expense) {
    return { error: 'Nothing to un-settle on this expense.' };
  }

  // Determine which split to un-settle: borrower un-settles their own, payer un-settles the other's
  const splitUserId = expense.paidById === user.id
    ? (formData.get('splitUserId') as string) || user.id
    : user.id;

  await db.expenseSplit.update({
    where: { expenseId_userId: { expenseId, userId: splitUserId } },
    data: { settledAt: null },
  });
  revalidatePath('/dashboard');
  revalidatePath('/people');
  revalidatePath('/expenses');
  if (expense.groupId) {
    revalidatePath(`/people/${expense.groupId}`);
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
  revalidatePath('/people');
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
  revalidatePath('/people/[id]');
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
