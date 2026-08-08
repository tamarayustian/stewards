import db from '@/lib/db';

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: { name?: unknown };
};

// TODO(pre-launch): identity for "friend" contacts is not foolproof.
// - Name-only contacts (email: null) never merge when the person later signs up —
//   they stay as a standalone "people" row, so expenses attached to that row won't
//   follow the account. Only contacts created WITH an email are silently merged
//   here (email === identity, via exact match).
// - If the same person registers later with a different email, you get a duplicate
//   User row. Fine with a single user / no live data; revisit before launch.
// - Proposed future flow: a /auth/claim "is this you?" confirmation at signup that
//   matches by email (strong) and name (weak), plus notifying the person who added
//   the friend (adder-side confirmation).

// Find-or-create the authenticated user's row. If a name-only "contact" already
// exists with the same email, transfer its records to the new account and delete
// the ghost row so the same person doesn't end up split across two User accounts.
export async function ensureUserRow(user: AuthUser) {
  const { id, email } = user;
  const name =
    (user.user_metadata?.name as string | undefined)?.trim() || email?.split('@')[0] || 'User';

  if (email) {
    const contact = await db.user.findUnique({ where: { email } });

    if (contact && contact.id !== id) {
      await db.$transaction(async (tx) => {
        await tx.expense.updateMany({
          where: { paidById: contact.id },
          data: { paidById: id },
        });
        await tx.expenseSplit.updateMany({
          where: { userId: contact.id },
          data: { userId: id },
        });
        await tx.groupMember.updateMany({
          where: { userId: contact.id },
          data: { userId: id },
        });
        await tx.user.delete({ where: { id: contact.id } });
        await tx.user.create({
          data: { id, email, name },
        });
      });
      return { merged: true as const, email };
    }
  }

  const existing = await db.user.findUnique({ where: { id } });

  if (!existing) {
    await db.user.create({
      data: { id, email: email ?? null, name },
    });
  }

  return { merged: false as const, email: email ?? null };
}

// Create a lightweight contact (name, optional email) for splitting directly
// with someone who doesn't have an account yet. Dedupes against existing users.
export async function addContact(input: { name: string; email?: string | null }) {
  const name = input.name.trim();
  const email = input.email?.trim() || null;

  if (!name) {
    return { error: 'Enter a name.' };
  }

  if (email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { contact: { id: existing.id, name: existing.name } };
    }
  }

  const contact = await db.user.create({
    data: { name, email },
    select: { id: true, name: true },
  });

  return { contact };
}

export type AddContactResult = Awaited<ReturnType<typeof addContact>>;
