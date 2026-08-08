import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { createServerClientReadOnly } from '@/lib/supabase';
import db from '@/lib/db';
import { listGroups, listUsersForDirect } from '@/lib/expenses';
import { AddExpenseForm } from '@/components/add-expense-form';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const initialExpense = {
    id: expense.id,
    groupId: expense.groupId,
    amount: expense.amount.toFixed(2),
    note: expense.note,
    paidById: expense.paidById,
    participants: expense.splits.map((s) => ({
      id: s.userId,
      name: s.userId === user.id ? 'You' : s.user.name,
    })),
    splits: Object.fromEntries(expense.splits.map((s) => [s.userId, s.amount.toFixed(2)])),
  };

  return (
    <AddExpenseForm
      groups={groups}
      users={users}
      currentUserId={user.id}
      initialExpense={initialExpense}
    />
  );
}
