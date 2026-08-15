'use client';

import { Users } from 'lucide-react';
import { useActionState } from 'react';

import { dismissGroupNotices } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function GroupJoinedNotice({
  groupName,
  inviterName,
}: {
  groupName: string;
  inviterName: string;
}) {
  const [, action, pending] = useActionState(dismissGroupNotices, undefined);

  return (
    <Card>
      <CardContent className="flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <Users className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">You&apos;ve joined {groupName}</p>
            <p className="text-sm text-muted-foreground">
              {inviterName} invited you to their group.
            </p>
          </div>
        </div>
        <form action={action}>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? 'Dismissing…' : 'Got it'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
