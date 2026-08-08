'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';

import { deleteExpense } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(deleteExpense, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button
        type="submit"
        variant="outline"
        size="icon"
        className="size-7"
        disabled={pending}
        title="Delete expense"
        aria-label="Delete expense"
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
