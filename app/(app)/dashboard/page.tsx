import { ArrowDownToLine, ArrowUpFromLine, Plus, ReceiptText, UserPlus } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GroupJoinedNotice } from '@/components/group-joined-notice';
import { ActivityFeed } from '@/components/activity-feed';
import { EmptyState } from '@/components/empty-state';
import { SettleUpCard } from '@/components/settle-up-card';
import { RemindCard } from '@/components/remind-card';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import db from '@/lib/db';
import { getActivity, getBalances, type ActivityFilter } from '@/lib/expenses';
import { listPendingNotices } from '@/lib/invites';
import { type Currency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { filter: filterParam } = await searchParams;
  const filter: ActivityFilter =
    filterParam === 'owe' || filterParam === 'owed' || filterParam === 'paid' ? filterParam : 'all';

  const [profile, balances, allActivity, filteredActivity, notices] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, currency: true },
    }),
    getBalances(user.id),
    getActivity(user.id),
    filter === 'all' ? null : getActivity(user.id, filter),
    listPendingNotices(user.email),
  ]);
  const activity = filteredActivity ?? allActivity;

  const userCurrency = (profile?.currency ?? 'HKD') as Currency;
  const displayName = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'User';
  const hasActivity = allActivity.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{profile?.email}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/expenses/new" />}>
          <Plus className="size-4" />
          Split an expense
        </Button>
      </div>

      <Separator />

      {notices.map((notice) => (
        <GroupJoinedNotice
          key={notice.inviteId}
          groupName={notice.groupName}
          inviterName={notice.inviterName}
        />
      ))}

      {balances.youOwe.gt(0) || balances.youAreOwed.gt(0) ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {balances.youOwe.gt(0) && (
            <StatCard
              icon={ArrowUpFromLine}
              tone="destructive"
              label="To pay"
              value={formatMoney(balances.youOwe, userCurrency)}
            />
          )}
          {balances.youAreOwed.gt(0) && (
            <StatCard
              icon={ArrowDownToLine}
              tone="accent"
              label="To collect"
              value={formatMoney(balances.youAreOwed, userCurrency)}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ArrowDownToLine className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">All settled</p>
              <p className="text-xs text-muted-foreground">No outstanding balances</p>
            </div>
          </CardContent>
        </Card>
      )}

      {balances.youOwe.gt(0) && (
        <SettleUpCard
          youOwe={formatMoney(balances.youOwe, userCurrency)}
          unsettledCount={balances.unsettledCount}
        />
      )}

      {balances.youAreOwed.gt(0) && (
        <RemindCard
          youAreOwed={formatMoney(balances.youAreOwed, userCurrency)}
          owedCount={balances.owedCount}
        />
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent activity</h2>
          <Button
            nativeButton={false}
            render={<Link href="/expenses?view=feed" />}
            variant="ghost"
            size="sm"
            className="text-primary"
          >
            View all
          </Button>
        </div>
        {hasActivity ? (
          <ActivityFeed items={activity} filter={filter} basePath="/dashboard" />
        ) : (
          <EmptyState
            className="mt-3"
            icon={ReceiptText}
            title="No expenses yet"
            message="Split your first cost with a group or directly with friends."
          >
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button nativeButton={false} render={<Link href="/expenses/new" />}>
                <Plus className="size-4" />
                Split an expense
              </Button>
              <Button nativeButton={false} render={<Link href="/settings" />} variant="outline">
                <UserPlus className="size-4" />
                Invite friends
              </Button>
            </div>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
