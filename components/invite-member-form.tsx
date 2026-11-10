'use client';

import { useActionState, useState } from 'react';

import { inviteToGroup } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InviteMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const [state, action, pending] = useActionState(inviteToGroup, undefined);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <Label htmlFor="invite-email">Invite by email</Label>
      <Input
        id="invite-email"
        name="email"
        type="email"
        placeholder="friend@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Inviting…' : 'Invite'}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}
