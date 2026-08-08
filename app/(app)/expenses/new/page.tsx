import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { createServerClientReadOnly } from '@/lib/supabase';
import { listGroups, listUsersForDirect } from '@/lib/expenses';
import { AddExpenseForm } from '@/components/add-expense-form';

export default async function AddExpensePage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [groups, users] = await Promise.all([listGroups(user.id), listUsersForDirect(user.id)]);

  return <AddExpenseForm groups={groups} users={users} currentUserId={user.id} />;
}
