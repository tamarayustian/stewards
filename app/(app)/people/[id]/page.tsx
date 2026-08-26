import { ArrowLeft, UserX, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cancelInvite } from '@/app/(app)/actions';
import { ConfirmAction } from '@/components/confirm-action';
import { ActivityFeed } from '@/components/activity-feed';
import { CounterpartyActions } from '@/components/counterparty-actions';
import { InviteMemberForm } from '@/components/invite-member-form';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { MarkReceivedButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { Button } from '@/components/ui/button';
import { getPairDetail, listReminders } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { getActivity, getGroup, type ActivityFilter } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { createServerClientReadOnly } from '@/lib/supabase';

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

  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [group, detail, reminders] = await Promise.all([
    getGroup(id, user.id),
    getPairDetail(user.id, id),
    listReminders(user.id),
  ]);

  if (group) {
    const activity = await getActivity(user.id, activeFilter, 50, id);
    return (
      <div className="space-y-6 p-6">
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/people" />}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to people
          </Button>
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
            <ActivityFeed items={activity} filter={activeFilter} basePath={`/people/${group.id}`} />
          </div>
        </section>
      </div>
    );
  }

  if (detail) {
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { currency: true },
    });
    const userCurrency = (profile?.currency ?? 'HKD') as Currency;

    const unreadFromThem = reminders.some((r) => r.fromId === id && !r.readAt);
    const { counterparty } = detail;

    return (
      <div className="space-y-6 p-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/people" />}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{counterparty.name}</h1>
            <p
              className={`mt-0.5 text-lg font-semibold ${
                detail.net.gt(0)
                  ? 'text-accent'
                  : detail.net.isZero()
                    ? 'text-muted-foreground'
                    : 'text-destructive'
              }`}
            >
              {detail.net.gt(0)
                ? `${counterparty.name} owes you ${formatMoney(detail.net, userCurrency)}`
                : detail.net.isZero()
                  ? 'All settled'
                  : `You owe ${counterparty.name} ${formatMoney(detail.net.abs(), userCurrency)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CounterpartyActions
              hasOwedToMe={detail.amountOwedToMe.gt(0)}
              counterparty={detail.counterparty}
              items={detail.items}
              viewerCurrency={userCurrency}
            >
              {unreadFromThem && (
                <MarkRemindersReadButton fromId={counterparty.id} />
              )}
            </CounterpartyActions>
          </div>
        </div>

        <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {detail.items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing to settle.
            </li>
          ) : (
            detail.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.note ?? 'Expense'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('en-HK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(item.date)}{' '}
                    · {item.direction === 'theyOweMe' ? 'You paid' : 'They paid'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="shrink-0 text-sm font-medium">
                    {item.direction === 'theyOweMe'
                      ? formatMoney(item.theirShare, item.currency)
                      : formatMoney(item.myShare, item.currency)}
                  </p>
                  {item.direction === 'theyOweMe' ? (
                    <MarkReceivedButton expenseId={item.expenseId} splitUserId={counterparty.id} />
                  ) : (
                    <SettleExpenseButton expenseId={item.expenseId} />
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  redirect('/people');
}
