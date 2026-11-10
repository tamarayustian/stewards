import Link from 'next/link';
import { redirect } from 'next/navigation';

import { deleteGroup, removeContact } from '@/app/(app)/actions';
import { BalanceStrip } from '@/components/balance-strip';
import { ConfirmAction } from '@/components/confirm-action';
import { GroupForm } from '@/components/group-form';
import { InviteFriend } from '@/components/invite-friend';
import { Money } from '@/components/money';
import { PageHead } from '@/components/page-head';
import { PeopleForm } from '@/components/people-form';
import { PersonAvatar } from '@/components/person-avatar';
import { SectionLine } from '@/components/section-line';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { formatMonthYear } from '@/lib/dates';
import { getBalances, listContacts, listGroups } from '@/lib/expenses';
import db from '@/lib/db';

export default async function GroupsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [groups, contacts, balances, profile] = await Promise.all([
    listGroups(user.id),
    listContacts(user.id),
    getBalances(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { currency: true } }),
  ]);

  const currency = profile?.currency ?? 'HKD';

  return (
    <div>
      <PageHead
        eyebrow={`People · ${formatMonthYear(new Date())}`}
        title="The people on the tab."
        sub="Groups and people you split expenses with."
        meta={`${currency} · base`}
        actions={<GroupForm />}
      />

      <BalanceStrip
        className="mt-7"
        items={[
          {
            label: 'They owe you',
            tone: 'hot',
            value: <Money amount={balances.youAreOwed} currency={currency} />,
            detail: 'Across every open share',
          },
          {
            label: 'You owe',
            value: <Money amount={balances.youOwe} currency={currency} />,
            detail: 'What you still have to send',
          },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <SectionLine
            title="Groups"
            meta={`${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
          >
            {groups.length > 0 ? (
              <div>
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                  >
                    <Link
                      href={`/people/${group.id}`}
                      className="min-w-0 flex-1 hover:opacity-70"
                    >
                      <p className="truncate font-heading text-[15px] font-bold tracking-[-0.02em]">
                        {group.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-ink-muted">
                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        {' · '}
                        {group.unsettledCount > 0
                          ? `${group.unsettledCount} unsettled`
                          : 'All square'}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {group.unsettledCount > 0 && (
                        <span
                          className="hidden text-[10.5px] text-ink-muted sm:inline"
                          title="Settle all expenses before deleting this group."
                        >
                          Settle all expenses before deleting this group.
                        </span>
                      )}
                      <Link
                        href={`/people/${group.id}`}
                        className="text-[10px] font-medium tracking-[0.12em] text-cobalt uppercase underline-offset-4 hover:underline"
                      >
                        Open group
                      </Link>
                      <ConfirmAction
                        action={deleteGroup}
                        fields={[{ name: 'groupId', value: group.id }]}
                        title="Delete this group?"
                        description="The group and its expenses will be hidden from everyone."
                        confirmLabel="Delete"
                        pendingLabel="Deleting…"
                        trigger={
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={group.unsettledCount > 0}
                            aria-disabled={group.unsettledCount > 0}
                            title={
                              group.unsettledCount > 0
                                ? 'Settle all expenses before deleting this group.'
                                : undefined
                            }
                          >
                            Delete
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-b border-line px-4 py-10 text-center">
                <p className="eyebrow">No groups yet</p>
                <p className="mt-2 text-[13px] text-body">
                  Create a group to start splitting expenses.
                </p>
              </div>
            )}
          </SectionLine>

          <SectionLine title="People" meta={`${contacts.length} on file`} className="mt-8">
            {contacts.length > 0 ? (
              <div>
                <div className="hidden border-b border-line py-2 text-[8.5px] tracking-[0.16em] text-ink-muted uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center sm:gap-3">
                  <span>Person</span>
                  <span>Relationship</span>
                  <span className="sr-only">Action</span>
                </div>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PersonAvatar name={contact.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{contact.name}</p>
                        <p className="truncate text-[10.5px] text-ink-muted">
                          {contact.isRegistered ? contact.email : 'No account yet'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-ink-muted">
                      {contact.isRegistered ? 'Registered' : 'Contact'}
                    </span>
                    <ConfirmAction
                      action={removeContact}
                      fields={[{ name: 'contactId', value: contact.id }]}
                      title={`Remove ${contact.name}?`}
                      description="They'll stop appearing when you add new expenses. Past expenses stay as they are."
                      confirmLabel="Remove"
                      pendingLabel="Removing…"
                      trigger={
                        <Button variant="ghost" size="sm" className="text-ink-muted">
                          Remove
                        </Button>
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-b border-line px-4 py-10 text-center">
                <p className="eyebrow">No people yet</p>
                <p className="mt-2 text-[13px] text-body">
                  Add people you actually split money with — they&apos;ll show up here and in the
                  expense form.
                </p>
              </div>
            )}
          </SectionLine>
        </div>

        <aside className="flex min-w-0 flex-col gap-7">
          <section className="border-t-2 border-ink pt-4">
            <PeopleForm />
          </section>
          <section className="border-t border-line pt-5">
            <InviteFriend />
          </section>
        </aside>
      </div>
    </div>
  );
}
