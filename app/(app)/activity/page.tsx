import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { BalanceList } from '@/components/balance-list';
import { getPairBalances, getPairDetail, listReminders } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { getActivity, type ActivityFilter } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

const views = [
  { key: 'feed', label: 'Feed' },
  { key: 'people', label: 'By Person' },
] as const;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Activity</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every expense you&apos;re part of, newest first.
            </p>
          </div>
          <ViewToggle current={view} />
        </div>
        <ActivityFeed items={activity} filter={filter} basePath="/activity?view=feed" />
      </div>
    );
  }

  const [pairs, reminders] = await Promise.all([
    getPairBalances(user.id),
    listReminders(user.id),
  ]);

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const userCurrency = (profile?.currency ?? 'HKD') as Currency;

  const rows = await Promise.all(
    pairs.map(async (pair) => {
      const canWhatsApp = Boolean(pair.counterparty.phone) && pair.amountOwedToMe.gt(0);
      const detail = canWhatsApp ? await getPairDetail(user.id, pair.counterparty.id) : null;
      return { pair, detail };
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Activity</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            What each person owes you and what you owe them.
          </p>
        </div>
        <ViewToggle current={view} />
      </div>
      <BalanceList reminders={reminders} rows={rows} userCurrency={userCurrency} />
    </div>
  );
}

function ViewToggle({ current }: { current: string }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {views.map((v) => (
        <Link
          key={v.key}
          href={`/activity?view=${v.key}`}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            current === v.key
              ? 'bg-card text-foreground ring-1 ring-foreground/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-current={current === v.key ? 'page' : undefined}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
