import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { getActivity, type ActivityFilter } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect('/login');
  }

  const params = await searchParams;
  const filter: ActivityFilter =
    params.filter === 'owe' || params.filter === 'owed' || params.filter === 'paid'
      ? params.filter
      : 'all';

  const activity = await getActivity(data.user.id, filter);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">All activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every expense you&apos;re part of, newest first.
        </p>
      </div>
      <ActivityFeed items={activity} filter={filter} basePath="/expenses" />
    </div>
  );
}
