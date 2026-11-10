import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { BalanceList } from '@/components/balance-list';
import { BalanceStrip } from '@/components/balance-strip';
import { Money } from '@/components/money';
import { PageHead } from '@/components/page-head';
import { PillTabs } from '@/components/pill-tabs';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getPairOverview } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { getActivity, getBalances, type ActivityFilter } from '@/lib/expenses';
import { formatMonthYear } from '@/lib/dates';

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

  const [balances, profile] = await Promise.all([
    getBalances(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { currency: true } }),
  ]);
  const currency = (profile?.currency ?? 'HKD') as Currency;
  const net = balances.youAreOwed.minus(balances.youOwe);

  const header = (
    <PageHead
      eyebrow={`Expenses · ${formatMonthYear(new Date())}`}
      title="Every expense, in order."
      sub="Newest first. Open, settled and everything between."
      actions={
        <Button nativeButton={false} render={<Link href="/expenses/new?from=/expenses" />}>
          <span aria-hidden="true">+</span> Split an expense
        </Button>
      }
    />
  );

  const strip = (
    <BalanceStrip
      items={[
        {
          label: 'You owe',
          value: <Money amount={balances.youOwe} currency={currency} />,
          tone: 'hot',
        },
        { label: 'Owed to you', value: <Money amount={balances.youAreOwed} currency={currency} /> },
        { label: 'Net', value: <Money amount={net} currency={currency} /> },
      ]}
    />
  );

  const lens = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <PillTabs
        variant="lens"
        searchParam="view"
        tabs={viewTabs}
        currentTab={view}
        className="mt-0"
      />
      <span className="eyebrow">{currency} · newest first</span>
    </div>
  );

  if (view === 'feed') {
    const activity = await getActivity(user.id, filter);

    return (
      <div className="space-y-6">
        {header}
        {strip}
        {lens}
        <ActivityFeed items={activity} filter={filter} variant="expenses" />
      </div>
    );
  }

  const { pairs, details, reminders, viewerCurrency } = await getPairOverview(user.id);

  const rows = pairs.map((pair) => ({
    pair,
    detail: details.get(pair.counterparty.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      {header}
      {strip}
      {lens}
      <BalanceList reminders={reminders} rows={rows} userCurrency={viewerCurrency} />
    </div>
  );
}
