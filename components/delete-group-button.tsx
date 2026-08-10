'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';

import { deleteGroup } from '@/app/(app)/actions';
import {
  AlertDialogRoot,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function DeleteGroupButton({
  groupId,
  disabled,
  blockedReason,
}: {
  groupId: string;
  disabled: boolean;
  blockedReason?: string;
}) {
  const [state, action, pending] = useActionState(deleteGroup, undefined);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <AlertDialogRoot open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="destructive"
              size="sm"
              disabled={disabled || pending}
              aria-disabled={disabled}
              title={disabled ? blockedReason : undefined}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          }
        />
        <AlertDialogPopup>
          <AlertDialogTitle>Delete this group?</AlertDialogTitle>
          <p className="text-sm text-muted-foreground">
            This permanently removes the group and its expenses. It can&apos;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <form action={action}>
              <input type="hidden" name="groupId" value={groupId} />
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {pending ? 'Deleting…' : 'Delete'}
              </Button>
            </form>
          </div>
        </AlertDialogPopup>
      </AlertDialogRoot>
      {disabled ? (
        <span className="hidden text-xs text-muted-foreground sm:inline" title={blockedReason}>
          {blockedReason}
        </span>
      ) : null}
      {state?.error && !disabled && <span className="text-xs text-destructive">{state.error}</span>}
    </div>
  );
}
