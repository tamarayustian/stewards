import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { getActivity } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function ExpensesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect('/login');
  }

  const activity = await getActivity(data.user.id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">All activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every expense you&apos;re part of, newest first.
        </p>
      </div>
      <ActivityFeed items={activity} filter="all" />
    </div>
  );
}
