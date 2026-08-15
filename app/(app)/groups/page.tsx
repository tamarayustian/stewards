import { Users } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteGroupButton } from '@/components/delete-group-button';
import { GroupForm } from '@/components/group-form';
import { Card, CardContent } from '@/components/ui/card';
import { listGroups } from '@/lib/expenses';
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

  const groups = await listGroups(user.id);

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
                  href={`/groups/${group.id}`}
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
    </div>
  );
}
