import { BookUser, Trash2, UserX, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { deleteGroup, removeContact } from '@/app/(app)/actions';
import { ConfirmAction } from '@/components/confirm-action';
import { EmptyState } from '@/components/empty-state';
import { GroupForm } from '@/components/group-form';
import { PeopleForm } from '@/components/people-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listContacts, listGroups } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [groups, contacts] = await Promise.all([listGroups(user.id), listContacts(user.id)]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">People</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Groups and people you split expenses with.
          </p>
        </div>
        <GroupForm />
      </div>

      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <Link
                  href={`/people/${group.id}`}
                  className="flex min-w-0 items-center gap-3 hover:opacity-70"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                      {group.unsettledCount > 0 &&
                        ` · ${group.unsettledCount} unsettled expense${group.unsettledCount === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
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
                        className="relative after:absolute after:-inset-2 after:content-['']"
                        disabled={group.unsettledCount > 0}
                        aria-disabled={group.unsettledCount > 0}
                        title={
                          group.unsettledCount > 0
                            ? 'Settle all expenses before deleting this group.'
                            : undefined
                        }
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    }
                  />
                  {group.unsettledCount > 0 && (
                    <span
                      className="hidden text-xs text-muted-foreground sm:inline"
                      title="Settle all expenses before deleting this group."
                    >
                      Settle all expenses before deleting this group.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No groups yet" message="Create a group to start splitting expenses." />
      )}

      <div id="people" className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Contacts</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Individual people you split expenses with.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <PeopleForm />
          </CardContent>
        </Card>

        {contacts.length > 0 ? (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.isRegistered ? contact.email : 'Contact — no account yet'}
                    </p>
                  </div>
                  <ConfirmAction
                    action={removeContact}
                    fields={[{ name: 'contactId', value: contact.id }]}
                    title={`Remove ${contact.name}?`}
                    description="They'll stop appearing when you add new expenses. Past expenses stay as they are."
                    confirmLabel="Remove"
                    pendingLabel="Removing…"
                    trigger={
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <UserX className="size-3.5" />
                        Remove
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookUser}
            title="No people yet"
            message="Add people you actually split money with — they'll show up here and in the expense form."
          />
        )}
      </div>
    </div>
  );
}
