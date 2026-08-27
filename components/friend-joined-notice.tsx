'use client';

import { UserPlus } from 'lucide-react';
import { useActionState } from 'react';

import { dismissFriendNotices } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function FriendJoinedNotice({ friendName }: { friendName: string }) {
  const [, action, pending] = useActionState(dismissFriendNotices, undefined);

  return (
    <Card>
      <CardContent className="flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <UserPlus className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">{friendName} joined Stewards</p>
            <p className="text-sm text-muted-foreground">Split with their account now.</p>
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