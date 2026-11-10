import { UserX, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cancelInvite } from '@/app/(app)/actions';
import { BackLink } from '@/components/back-link';
import { BalanceStrip } from '@/components/balance-strip';
import { ConfirmAction } from '@/components/confirm-action';
import { ActivityFeed } from '@/components/activity-feed';
import { CounterpartyActions } from '@/components/counterparty-actions';
import { InviteMemberForm } from '@/components/invite-member-form';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { Money } from '@/components/money';
import { PageHead } from '@/components/page-head';
import { MarkReceivedButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { StatePill } from '@/components/state-pill';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getPairDetail } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { formatLedgerDate } from '@/lib/dates';
import { getActivity, getGroup, type ActivityFilter } from '@/lib/expenses';

export default async function PersonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter } = await searchParams;
  const activeFilter: ActivityFilter =
    filter === 'owe' || filter === 'owed' || filter === 'paid' ? filter : 'all';

  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Resolve the group first: group pages never need pair detail or reminders,
  // so this avoids four wasted split queries and a full pair-balance scan.
  const group = await getGroup(id, user.id);

  if (group) {
    const activity = await getActivity(user.id, activeFilter, 50, id);
    return (
      <div className="space-y-6 p-6">
        <div>
          <BackLink href="/people" label="Back to people" className="text-muted-foreground" />
          <h1 className="mt-2 text-2xl font-semibold">{group.name}</h1>
          {group.description && (
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {group.members.length} member{group.members.length === 1 ? '' : 's'}
            {group.unsettledCount > 0 && ` · ${group.unsettledCount} unsettled`}
          </p>
        </div>

        <section>
          <h2 className="text-base font-semibold">Members</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.members.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
              >
                <Users className="size-4 text-muted-foreground" />
                {member.name}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold">Invites</h2>
          <div className="mt-3">
            <InviteMemberForm groupId={group.id} />
          </div>
          {group.invites.length > 0 && (
            <ul className="mt-4 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
              {group.invites.map((invite) => {
                const isJoined = invite.status === 'joined';
                return (
                  <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {isJoined ? 'Joined' : 'Pending'} · invited by {invite.inviterName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {isJoined ? 'Joined' : 'Pending'}
                      </span>
                      {!isJoined && (
                        <ConfirmAction
                          action={cancelInvite}
                          fields={[
                            { name: 'inviteId', value: invite.id },
                            { name: 'groupId', value: group.id },
                          ]}
                          title="Cancel invite"
                          description="Cancel this invite? The person won't be able to join the group."
                          confirmLabel="Cancel invite"
                          pendingLabel="Cancelling…"
                          cancelLabel="Keep invite"
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                            >
                              <UserX className="size-3.5" />
                              Cancel
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold">Expenses</h2>
          <div className="mt-3">
            <ActivityFeed items={activity} filter={activeFilter} />
          </div>
        </section>
      </div>
    );
  }

  const detail = await getPairDetail(user.id, id);

  if (detail) {
    // Reminders only surface when the viewer still owes this person on a
    // non-zero net balance, so one count against this sender replaces the
    // full pair-balance scan listReminders() used to run here.
    const showReminders = detail.amountIOwe.gt(0) && !detail.net.isZero();
    const [profile, unreadCount] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: { currency: true },
      }),
      showReminders
        ? db.reminder.count({ where: { toId: user.id, fromId: id, readAt: null } })
        : Promise.resolve(0),
    ]);
    const userCurrency = (profile?.currency ?? 'HKD') as Currency;

    const unreadFromThem = unreadCount > 0;
    const { counterparty } = detail;

    const firstShared = [...detail.items].sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    const lastActivity = detail.items.reduce<Date | null>(
      (latest, item) => (!latest || item.date > latest ? item.date : latest),
      null,
    );
    const position = detail.net.gt(0) ? 'They owe you' : detail.net.isZero() ? 'All settled' : 'You owe';

    return (
      <div className="mx-auto w-full max-w-[1240px]">
        <Link
          href="/people"
          className="eyebrow inline-flex items-center gap-1 text-cobalt hover:underline"
        >
          ← Back to people
        </Link>

        <div className="mt-4">
          <PageHead
            eyebrow="Direct · member"
            title={counterparty.name}
            sub={firstShared ? `Since ${formatLedgerDate(firstShared.date)}` : undefined}
            actions={
              <CounterpartyActions
                hasOwedToMe={detail.amountOwedToMe.gt(0)}
                counterparty={detail.counterparty}
                items={detail.items}
                viewerCurrency={userCurrency}
              >
                {unreadFromThem && <MarkRemindersReadButton fromId={counterparty.id} />}
              </CounterpartyActions>
            }
          />
        </div>

        <div className="mt-6">
          <BalanceStrip
            items={[
              {
                label: position,
                value: <Money amount={detail.net.abs()} currency={userCurrency} />,
                detail: `${detail.items.length} open ${detail.items.length === 1 ? 'share' : 'shares'}`,
                tone: detail.net.lt(0) ? 'hot' : 'default',
              },
              {
                label: 'Last activity',
                value: lastActivity ? formatLedgerDate(lastActivity) : '—',
                detail: lastActivity ? 'Most recent shared expense' : 'No shared expenses yet',
              },
            ]}
          />
        </div>

        <section className="mt-8">
          <div className="hidden grid-cols-[84px_minmax(0,1fr)_110px_110px_80px_160px] items-center gap-3 border-b border-line py-2 min-[1100px]:grid">
            {['Date', 'Expense', 'Total', 'Your share', 'State', 'Action'].map((heading) => (
              <span key={heading} className="eyebrow">
                {heading}
              </span>
            ))}
          </div>

          {detail.items.length === 0 ? (
            <div className="border-y border-line px-4 py-10 text-center">
              <p className="eyebrow">No entries</p>
              <p className="mt-1 text-[13px] text-body">Nothing to settle.</p>
            </div>
          ) : (
            detail.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-line py-3 min-[1100px]:grid-cols-[84px_minmax(0,1fr)_110px_110px_80px_160px] min-[1100px]:items-center min-[1100px]:gap-3"
              >
                <span className="num hidden text-[11px] text-ink-muted min-[1100px]:block">
                  {formatLedgerDate(item.date)}
                </span>

                <div className="min-w-0">
                  <p className="break-words text-[15px] font-medium text-ink">
                    {item.note ?? 'Expense'}
                  </p>
                  <p className="text-[10.5px] text-ink-muted">
                    <span className="min-[1100px]:hidden">{formatLedgerDate(item.date)} · </span>
                    {item.direction === 'theyOweMe' ? 'You paid' : 'They paid'}
                  </p>
                </div>

                <Money
                  amount={item.amount}
                  currency={item.currency}
                  className="hidden text-[13px] min-[1100px]:block"
                />

                <Money
                  amount={item.direction === 'theyOweMe' ? item.theirShare : item.myShare}
                  currency={item.currency}
                  className="justify-self-end text-[13px] min-[1100px]:justify-self-start"
                />

                <StatePill
                  tone="open"
                  className="col-start-2 justify-self-end min-[1100px]:col-start-auto min-[1100px]:justify-self-start"
                />

                <div className="col-span-full flex min-[1100px]:col-span-1 min-[1100px]:justify-end">
                  {item.direction === 'theyOweMe' ? (
                    <MarkReceivedButton
                      expenseId={item.expenseId}
                      splitUserId={counterparty.id}
                    />
                  ) : (
                    <SettleExpenseButton expenseId={item.expenseId} />
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    );
  }

  redirect('/people');
}
