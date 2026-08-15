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
        await tx.contact.updateMany({
          where: { ownerId: contact.id },
          data: { ownerId: id },
        });
        await tx.contact.updateMany({
          where: { contactId: contact.id },
          data: { contactId: id },
        });
        await tx.user.delete({ where: { id: contact.id } });
        await tx.user.create({
          data: { id, email, name, isRegistered: true },
        });
      });
      return { merged: true as const, email };
    }
  }

  const existing = await db.user.findUnique({ where: { id } });

  if (!existing) {
    await db.user.create({
      data: { id, email: email ?? null, name, isRegistered: true },
    });
  } else {
    await db.user.update({ where: { id }, data: { isRegistered: true } });
  }

  return { merged: false as const, email: email ?? null };
}

// Create a lightweight contact (name, optional email) for splitting directly
// with someone who doesn't have an account yet. Dedupes against existing users.
export async function addContact(input: { ownerId: string; name: string; email?: string | null }) {
  const name = input.name.trim();
  const email = input.email?.trim() || null;

  if (!name) {
    return { error: 'Enter a name.' };
  }

  if (email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.id === input.ownerId) {
        return { error: "That's your own email." };
      }
      await db.contact.upsert({
        where: { ownerId_contactId: { ownerId: input.ownerId, contactId: existing.id } },
        create: { ownerId: input.ownerId, contactId: existing.id },
        update: {},
      });
      return {
        contact: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          isRegistered: existing.isRegistered,
        },
      };
    }
  }

  const contact = await db.user.create({
    data: { name, email },
    select: { id: true, name: true },
  });
  await db.contact.create({ data: { ownerId: input.ownerId, contactId: contact.id } });

  return { contact: { id: contact.id, name: contact.name, email: null, isRegistered: false } };
}

export type AddContactResult = Awaited<ReturnType<typeof addContact>>;
