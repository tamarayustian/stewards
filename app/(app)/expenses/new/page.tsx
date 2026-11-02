import { redirect } from 'next/navigation';

import { AddExpenseForm } from '@/components/add-expense-form';
import { getCurrentUser } from '@/lib/auth';
import { listGroups, listUsersForDirect } from '@/lib/expenses';
import db from '@/lib/db';
import { type Currency } from '@/lib/currencies';

export default async function AddExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const returnTo = params.from || '/dashboard';

  const [groups, users] = await Promise.all([listGroups(user.id), listUsersForDirect(user.id)]);

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const homeCurrency = (profile?.currency ?? 'HKD') as Currency;

  return (
    <AddExpenseForm
      groups={groups}
      users={users}
      currentUserId={user.id}
      homeCurrency={homeCurrency}
      returnTo={returnTo}
    />
  );
}
