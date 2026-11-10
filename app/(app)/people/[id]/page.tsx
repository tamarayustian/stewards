import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cancelInvite } from '@/app/(app)/actions';
import { ActivityFeed } from '@/components/activity-feed';
import { BalanceStrip } from '@/components/balance-strip';
import { ConfirmAction } from '@/components/confirm-action';
import { CounterpartyActions } from '@/components/counterparty-actions';
import { InviteMemberForm } from '@/components/invite-member-form';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { Money } from '@/components/money';
import { PageHead } from '@/components/page-head';
import { PersonAvatar } from '@/components/person-avatar';
import { SectionLine } from '@/components/section-line';
import { MarkReceivedButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { StatePill } from '@/components/state-pill';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { initials } from '@/lib/avatars';
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
    const balances = group.balances;

    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/people"
            className="eyebrow inline-flex items-center gap-1 text-cobalt hover:underline"
          >
            ← Back to people
          </Link>
          <div className="mt-5 space-y-4">
            <span
              className="flex size-10 items-center justify-center rounded-[6px] bg-cobalt font-heading text-sm font-extrabold text-paper"
              aria-hidden
            >
              {initials(group.name)}
            </span>
            <PageHead
              eyebrow={`Group · ${group.name}`}
              title={group.name}
              sub={`${group.members.length} member${group.members.length === 1 ? '' : 's'} · ${group.unsettledCount} unsettled expense${group.unsettledCount === 1 ? '' : 's'}`}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="#invite" />}
                  >
                    Invite
                  </Button>
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/expenses/new?groupId=${group.id}&from=/people/${group.id}`} />}
                  >
                    <span aria-hidden>+</span> Add expense
                  </Button>
                </>
              }
            />
          </div>
          {group.description && (
            <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed text-body">
              {group.description}
            </p>
          )}
        </div>

        <BalanceStrip
          items={[
            {
              label: 'Group total',
              value: <Money amount={balances.total} currency={group.viewerCurrency} />,
              detail: 'Every expense on the tab',
            },
            {
              label: 'Owed to you',
              value: <Money amount={balances.owedToViewer} currency={group.viewerCurrency} />,
              detail: 'Across open shares',
              tone: 'hot',
            },
            {
              label: 'You owe',
              value: <Money amount={balances.viewerOwes} currency={group.viewerCurrency} />,
              detail: 'What you still have to send',
            },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-10">
            <section>
              <SectionLine title="Members" meta={`${group.members.length} on the tab`} />
              <div className="hidden grid-cols-[minmax(0,1fr)_100px_140px] gap-3 border-b border-line py-2 sm:grid">
                <span className="eyebrow">Person</span>
                <span className="eyebrow">Role</span>
                <span className="eyebrow text-right">Net</span>
              </div>
              {group.members.map((member) => {
                const net = balances.memberNets.get(member.id);
                return (
                  <div
                    key={member.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 sm:grid-cols-[minmax(0,1fr)_100px_140px]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar name={member.name} size="xs" />
                      <span className="truncate text-[15px] font-medium text-ink">
                        {member.name}
                      </span>
                    </div>
                    <span className="hidden text-[11px] text-ink-muted sm:block">
                      {member.id === user.id ? 'You' : 'Member'}
                    </span>
                    <span
                      className={`text-right text-[13px] ${
                        net?.gt(0) ? 'text-sage' : net?.lt(0) ? 'text-rust' : 'text-ink-muted'
                      }`}
                    >
                      {net?.gt(0) ? '+' : net?.lt(0) ? '−' : null}
                      {net && !net.isZero() ? (
                        <Money amount={net.abs()} currency={group.viewerCurrency} />
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                );
              })}
            </section>

            <section>
              <SectionLine
                title="Expenses"
                action={
                  <Link href="/expenses" className="eyebrow text-cobalt hover:underline">
                    All expenses →
                  </Link>
                }
              />
              <ActivityFeed items={activity} filter={activeFilter} variant="group" />
            </section>
          </div>

          <aside className="flex flex-col gap-8">
            <section className="border-t-2 border-ink pt-3">
              <h2 className="eyebrow text-cobalt">The group</h2>
              <dl className="mt-3 divide-y divide-line">
                <div className="flex items-baseline justify-between py-2">
                  <dt className="text-[11px] text-ink-muted">Members</dt>
                  <dd className="num text-[13px]">{group.members.length}</dd>
                </div>
                <div className="flex items-baseline justify-between py-2">
                  <dt className="text-[11px] text-ink-muted">Open expenses</dt>
                  <dd className="num text-[13px]">{group.unsettledCount}</dd>
                </div>
                <div className="flex items-baseline justify-between py-2">
                  <dt className="text-[11px] text-ink-muted">Currency</dt>
                  <dd className="num text-[13px]">{group.viewerCurrency}</dd>
                </div>
              </dl>
            </section>

            <section id="invite" className="scroll-mt-6 border-t-2 border-ink pt-3">
              <h2 className="eyebrow text-cobalt">Invite</h2>
              <div className="mt-4">
                <InviteMemberForm groupId={group.id} />
              </div>
              {group.invites.length > 0 && (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {group.invites.map((invite) => {
                    const isJoined = invite.status === 'joined';
                    return (
                      <li key={invite.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">{invite.email}</p>
                          <p className="text-[10.5px] text-ink-muted">
                            Invited by {invite.inviterName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatePill tone={isJoined ? 'settled' : 'pending'}>
                            {isJoined ? 'Joined' : 'Pending'}
                          </StatePill>
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
                                  className="h-7 px-2 text-rust"
                                >
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
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-muted">
                Pending invites stay visible to members until the address joins.
              </p>
            </section>
          </aside>
        </div>
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
