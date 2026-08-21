'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import { deleteExpense } from '@/app/(app)/actions';
import {
  AlertDialogPopup,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(deleteExpense, undefined);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <AlertDialogRoot open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="relative size-7 after:absolute after:-inset-1 after:content-['']"
              title="Delete expense"
              aria-label="Delete expense"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          }
        />
        <AlertDialogPopup>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <p className="text-sm text-muted-foreground">
            The expense and its splits will be hidden from you and everyone else.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <form action={action}>
              <input type="hidden" name="expenseId" value={expenseId} />
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {pending ? 'Deleting…' : 'Delete'}
              </Button>
            </form>
          </div>
        </AlertDialogPopup>
      </AlertDialogRoot>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </div>
  );
}
