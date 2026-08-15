'use client';

import { UserX } from 'lucide-react';
import { useActionState, useState } from 'react';

import { cancelInvite } from '@/app/(app)/actions';
import {
  AlertDialogPopup,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function CancelInviteButton({ inviteId, groupId }: { inviteId: string; groupId: string }) {
  const [state, action, pending] = useActionState(cancelInvite, undefined);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialogRoot open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
            <UserX className="size-3.5" />
            Cancel
          </Button>
        }
      />
      <AlertDialogPopup>
        <AlertDialogTitle className="sr-only">Cancel invite</AlertDialogTitle>
        <p className="text-sm text-muted-foreground">
          Cancel this invite? The person won&apos;t be able to join the group.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Keep invite
          </Button>
          <form action={action}>
            <input type="hidden" name="inviteId" value={inviteId} />
            <input type="hidden" name="groupId" value={groupId} />
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? 'Cancelling…' : 'Cancel invite'}
            </Button>
          </form>
        </div>
        {state?.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {state.error}
          </p>
        )}
      </AlertDialogPopup>
    </AlertDialogRoot>
  );
}
