import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { BalanceList } from '@/components/balance-list';
import { Button } from '@/components/ui/button';
import { PillTabs } from '@/components/pill-tabs';
import { getCurrentUser } from '@/lib/auth';
import { getPairOverview } from '@/lib/balances';
import { getActivity, type ActivityFilter } from '@/lib/expenses';

const viewTabs = [
  { key: 'feed', label: 'Feed' },
  { key: 'people', label: 'By Person' },
];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  const user = await getCurrentUser();

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
        <ActivityFeed items={activity} filter={filter} />
      </div>
    );
  }

  const { pairs, details, reminders, viewerCurrency } = await getPairOverview(user.id);

  const rows = pairs.map((pair) => ({
    pair,
    detail: details.get(pair.counterparty.id) ?? null,
  }));

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
      <BalanceList reminders={reminders} rows={rows} userCurrency={viewerCurrency} />
    </div>
  );
}
