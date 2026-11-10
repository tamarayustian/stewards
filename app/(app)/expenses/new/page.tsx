import { redirect } from 'next/navigation';

import { AddExpenseForm } from '@/components/add-expense-form';
import { PageHead } from '@/components/page-head';
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
    <>
      <PageHead
        eyebrow={`New entry · ${homeCurrency}`}
        title="Enter an expense."
        sub="Split a shared cost with a group or directly with friends."
        meta="Draft · not saved"
      />
      <div className="mt-8">
        <AddExpenseForm
          groups={groups}
          users={users}
          currentUserId={user.id}
          homeCurrency={homeCurrency}
          returnTo={returnTo}
        />
      </div>
    </>
  );
}
