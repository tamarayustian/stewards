'use client';

import { useActionState } from 'react';
import { Check, CheckCheck } from 'lucide-react';

import { settleExpense } from '@/app/(app)/actions';
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
        className="h-6 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent hover:bg-accent/20"
        disabled={pending}
        title="Mark this share as paid"
      >
        <Check className="size-3" />
        {pending ? 'Marking…' : 'Mark paid'}
      </Button>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

export function PaidChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <CheckCheck className="size-3" />
      paid
    </span>
  );
}
