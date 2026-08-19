import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AddExpenseForm } from '@/components/add-expense-form';
import { listGroups, listUsersForDirect } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';
import db from '@/lib/db';
import { type Currency } from '@/lib/currencies';

export default async function AddExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
