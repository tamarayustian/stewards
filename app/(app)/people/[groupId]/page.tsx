import { ArrowLeft, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CancelInviteButton } from '@/components/cancel-invite-button';
import { ActivityFeed } from '@/components/activity-feed';
import { InviteMemberForm } from '@/components/invite-member-form';
import { Button } from '@/components/ui/button';
import { getActivity, getGroup, type ActivityFilter } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { groupId } = await params;
  const { filter } = await searchParams;
  const activeFilter: ActivityFilter =
    filter === 'owe' || filter === 'owed' || filter === 'paid' ? filter : 'all';

  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [group, activity] = await Promise.all([
    getGroup(groupId, user.id),
    getActivity(user.id, activeFilter, 50, groupId),
  ]);

  if (!group) redirect('/people');

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
                    {!isJoined && <CancelInviteButton inviteId={invite.id} groupId={group.id} />}
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
