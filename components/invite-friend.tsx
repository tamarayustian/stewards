'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/toast';
import { useInviteLink } from '@/components/use-invite-link';

export function InviteFriend({ bare = false }: { bare?: boolean } = {}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const { copyInviteLink } = useInviteLink();

  return (
    <div>
      {!bare && (
        <>
          <p className="eyebrow">Open invite</p>
          <h2 className="mt-1.5 font-heading text-[19px] font-bold tracking-[-0.03em]">
            Bring someone in.
          </h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
            Copy a sign-up link with their details pre-filled. They appear in the direct-expense
            picker once they join.
          </p>
        </>
      )}
      <div className={bare ? 'space-y-2' : 'mt-4 space-y-2'}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friend's name"
          aria-label="Friend's name"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="friend@example.com"
          aria-label="Friend's email"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={async () => {
            const ok = await copyInviteLink({ name, email });
            if (ok) {
              toast({ title: 'Invite link copied', variant: 'success' });
            } else {
              toast({ title: 'Could not copy link', variant: 'error' });
            }
          }}
        >
          Copy invite link
        </Button>
      </div>
    </div>
  );
}
