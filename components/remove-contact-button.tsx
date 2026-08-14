'use client';

import { UserX } from 'lucide-react';
import { useActionState, useState } from 'react';

import { removeContact } from '@/app/(app)/actions';
import {
  AlertDialogPopup,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function RemoveContactButton({ contactId, name }: { contactId: string; name: string }) {
  const [state, action, pending] = useActionState(removeContact, undefined);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialogRoot open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <UserX className="size-3.5" />
            Remove
          </Button>
        }
      />
      <AlertDialogPopup>
        <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
        <p className="text-sm text-muted-foreground">
          They&apos;ll stop appearing when you add new expenses. Past expenses stay as they are.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={action}>
            <input type="hidden" name="contactId" value={contactId} />
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? 'Removing…' : 'Remove'}
            </Button>
          </form>
        </div>
      </AlertDialogPopup>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </AlertDialogRoot>
  );
}
