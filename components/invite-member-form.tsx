'use client';

import { Send } from 'lucide-react';
import { useActionState, useState } from 'react';

import { inviteToGroup } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InviteMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const [state, action, pending] = useActionState(inviteToGroup, undefined);

  return (
    <form action={action} className="max-w-md space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <Label htmlFor="invite-email">Invite by email</Label>
      <div className="flex gap-2">
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? 'Inviting…' : 'Invite'}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
