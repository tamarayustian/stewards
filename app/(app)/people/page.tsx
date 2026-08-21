import { BookUser, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteGroupButton } from '@/components/delete-group-button';
import { GroupForm } from '@/components/group-form';
import { PeopleForm } from '@/components/people-form';
import { RemoveContactButton } from '@/components/remove-contact-button';
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
          <h1 className="text-xl font-semibold">Groups</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The people and places you split with regularly.
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
                <DeleteGroupButton
                  groupId={group.id}
                  disabled={group.unsettledCount > 0}
                  blockedReason={
                    group.unsettledCount > 0
                      ? 'Settle all expenses before deleting this group.'
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No groups yet</p>
              <p className="text-sm text-muted-foreground">
                Create a group to start splitting expenses.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div id="people" className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">People</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The people you split expenses with.
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
                  <RemoveContactButton contactId={contact.id} name={contact.name} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <BookUser className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No people yet</p>
                <p className="text-sm text-muted-foreground">
                  Add people you actually split money with — they&apos;ll show up here and in the
                  expense form.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
