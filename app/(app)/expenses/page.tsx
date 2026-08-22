import { Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { BalanceList } from '@/components/balance-list';
import { Button } from '@/components/ui/button';
import { PillTabs } from '@/components/pill-tabs';
import { getPairBalances, getPairDetail, listReminders } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { getActivity, type ActivityFilter } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

const viewTabs = [
  { key: 'feed', label: 'Feed' },
  { key: 'people', label: 'By Person' },
];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>;
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
  const view: string = params.view === 'people' ? 'people' : 'feed';
  const filter: ActivityFilter =
    params.filter === 'owe' || params.filter === 'owed' || params.filter === 'paid'
      ? params.filter
      : 'all';

  if (view === 'feed') {
    const activity = await getActivity(user.id, filter);

    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Expenses</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every expense you&apos;re part of, newest first.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button nativeButton={false} render={<Link href="/expenses/new?from=/expenses" />}>
              <Plus className="size-4" />
              Split an expense
            </Button>
            <PillTabs searchParam="view" tabs={viewTabs} currentTab={view} />
          </div>
        </div>
        <ActivityFeed items={activity} filter={filter} basePath="/expenses?view=feed" />
      </div>
    );
  }

  const [pairs, reminders] = await Promise.all([getPairBalances(user.id), listReminders(user.id)]);

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const userCurrency = (profile?.currency ?? 'HKD') as Currency;

  const rows = await Promise.all(
    pairs.map(async (pair) => {
      const canMessage = pair.amountOwedToMe.gt(0);
      const detail = canMessage ? await getPairDetail(user.id, pair.counterparty.id) : null;
      return { pair, detail };
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Expenses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            What each person owes you and what you owe them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/expenses/new?from=/expenses" />}>
            <Plus className="size-4" />
            Split an expense
          </Button>
          <PillTabs searchParam="view" tabs={viewTabs} currentTab={view} />
        </div>
      </div>
      <BalanceList reminders={reminders} rows={rows} userCurrency={userCurrency} />
    </div>
  );
}


