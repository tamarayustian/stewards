'use client';

import { Link2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';
import { useInviteLink } from '@/components/use-invite-link';

export function InviteFriend() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const { copyInviteLink } = useInviteLink();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Invite a friend</p>
      <p className="text-xs text-muted-foreground">
        Copy a sign-up link with their details pre-filled. Once they create an account, they&apos;ll
        appear in the direct-expense picker.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friend's name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          const ok = await copyInviteLink({ name, email });
          if (ok) {
            toast({ title: 'Invite link copied', variant: 'success' });
          } else {
            toast({ title: 'Could not copy link', variant: 'error' });
          }
        }}
      >
        <Link2 className="size-4" />
        Copy invite link
      </Button>
    </div>
  );
}
