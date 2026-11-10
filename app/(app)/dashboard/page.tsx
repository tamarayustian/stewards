import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { BalanceStrip } from '@/components/balance-strip';
import { FriendJoinedNotice } from '@/components/friend-joined-notice';
import { GroupJoinedNotice } from '@/components/group-joined-notice';
import { Money } from '@/components/money';
import { PageHead } from '@/components/page-head';
import { RemindCard } from '@/components/remind-card';
import { SectionLine } from '@/components/section-line';
import { SettleUpCard } from '@/components/settle-up-card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { formatMonthYear } from '@/lib/dates';
import { getActivity, getBalances, hasAnyActivity, type ActivityFilter } from '@/lib/expenses';
import { listPendingNotices } from '@/lib/invites';
import { formatMoney } from '@/lib/money';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { filter: filterParam } = await searchParams;
  const filter: ActivityFilter =
    filterParam === 'owe' || filterParam === 'owed' || filterParam === 'paid' ? filterParam : 'all';

  const [profile, balances, activity, hasActivity, notices, expenseCount] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { currency: true },
    }),
    getBalances(user.id),
    getActivity(user.id, filter),
    hasAnyActivity(user.id),
    listPendingNotices(user.email, user.id),
    db.expense.count({ where: { deletedAt: null, splits: { some: { userId: user.id } } } }),
  ]);

  const userCurrency = (profile?.currency ?? 'HKD') as Currency;
  const net = balances.youAreOwed.minus(balances.youOwe);
  const allSquare = balances.youOwe.isZero() && balances.youAreOwed.isZero();
  const month = formatMonthYear(new Date());

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow={`Personal ledger · ${month}`}
        title="Your tab, on the record."
        sub="Everything you owe and everything owed to you, in one place."
        meta={month}
        actions={
          <Button nativeButton={false} render={<Link href="/expenses/new?from=/dashboard" />}>
            New expense
          </Button>
        }
      />

      {notices.map((notice) =>
        notice.kind === 'group' ? (
          <GroupJoinedNotice
            key={notice.inviteId}
            groupName={notice.groupName}
            inviterName={notice.inviterName}
          />
        ) : (
          <FriendJoinedNotice key={notice.noticeId} friendName={notice.friendName} />
        ),
      )}

      <BalanceStrip
        items={[
          {
            label: 'To collect',
            tone: 'hot',
            value: <Money amount={balances.youAreOwed} currency={userCurrency} />,
            detail: `across ${balances.owedCount} ${balances.owedCount === 1 ? 'expense' : 'expenses'}`,
          },
          {
            label: 'You owe',
            value: <Money amount={balances.youOwe} currency={userCurrency} />,
            detail: `across ${balances.unsettledCount} ${balances.unsettledCount === 1 ? 'expense' : 'expenses'}`,
          },
          {
            label: 'Net position',
            value: <Money amount={net} currency={userCurrency} />,
            detail: allSquare ? 'All square.' : 'If everyone settles today',
          },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_296px]">
        <div>
          <SectionLine
            title="Recent expenses"
            action={
              hasActivity ? (
                <Link
                  href="/expenses?view=feed"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-cobalt underline-offset-4 hover:underline"
                >
                  All {expenseCount} expenses →
                </Link>
              ) : undefined
            }
          />
          <ActivityFeed
            items={activity}
            filter={filter}
            variant="dashboard"
            showFilters={hasActivity}
            emptyAction={
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Button nativeButton={false} render={<Link href="/expenses/new" />}>
                  New expense
                </Button>
                <Button nativeButton={false} render={<Link href="/settings" />} variant="outline">
                  Invite friends
                </Button>
              </div>
            }
          />
        </div>

        {(balances.youOwe.gt(0) || balances.youAreOwed.gt(0)) && (
          <aside className="flex flex-col gap-6">
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
          </aside>
        )}
      </div>
    </div>
  );
}
