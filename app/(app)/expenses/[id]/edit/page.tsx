import { notFound, redirect } from 'next/navigation';

import { AddExpenseForm } from '@/components/add-expense-form';
import { PageHead } from '@/components/page-head';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { type Currency } from '@/lib/currencies';
import { expenseDateKey } from '@/lib/expense-date';
import { listGroups, listUsersForDirect } from '@/lib/expenses';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const expense = await db.expense.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [{ paidById: user.id }, { splits: { some: { userId: user.id } } }],
    },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!expense) {
    notFound();
  }

  const [groups, users] = await Promise.all([listGroups(user.id), listUsersForDirect(user.id)]);

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const homeCurrency = (profile?.currency ?? 'HKD') as Currency;

  const initialExpense = {
    id: expense.id,
    groupId: expense.groupId,
    amount: expense.amount.toFixed(2),
    note: expense.note,
    occurredAt: expenseDateKey(expense.occurredAt ?? expense.createdAt),
    paidById: expense.paidById,
    participants: expense.splits.map((s) => ({
      id: s.userId,
      name: s.userId === user.id ? 'You' : s.user.name,
    })),
    splits: Object.fromEntries(expense.splits.map((s) => [s.userId, s.amount.toFixed(2)])),
  };

  return (
    <>
      <PageHead
        eyebrow={`Edit entry · ${homeCurrency}`}
        title="Edit the entry."
        sub="Split a shared cost with a group or directly with friends."
        meta="Editing · changes apply immediately"
      />
      <div className="mt-8">
        <AddExpenseForm
          groups={groups}
          users={users}
          currentUserId={user.id}
          initialExpense={initialExpense}
          homeCurrency={homeCurrency}
        />
      </div>
    </>
  );
}
