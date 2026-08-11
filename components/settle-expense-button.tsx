'use client';

import { useActionState } from 'react';
import { Check, CheckCheck } from 'lucide-react';

import { settleExpense, unsettleExpense } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export function SettleExpenseButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(settleExpense, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="relative h-6 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent hover:bg-accent/20 after:absolute after:-inset-2.5 after:content-['']"
        disabled={pending}
        title="Mark this share as paid"
      >
        <Check className="size-3" />
        {pending ? 'Marking…' : 'Mark paid'}
      </Button>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function MarkUnpaidButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(unsettleExpense, undefined);
  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="relative h-6 rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground after:absolute after:-inset-2.5 after:content-['']"
        disabled={pending}
        title="Mark this share as unpaid"
      >
        <CheckCheck className="size-3" />
        {pending ? 'Marking…' : 'paid'}
      </Button>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
