'use client';

import { Check, CheckCheck } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';

import { settleExpense, unsettleExpense } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

type Phase = 'idle' | 'celebrating' | 'settled';

export function SettleExpenseButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(settleExpense, undefined);
  const [phase, setPhase] = useState<Phase>('idle');
  const wasPendingRef = useRef(false);

  useEffect(() => {
    const justCompleted = wasPendingRef.current && !pending;
    wasPendingRef.current = pending;

    if (justCompleted && !state?.error) {
      setPhase('celebrating');
      const timer = setTimeout(() => setPhase('settled'), 1200);
      return () => clearTimeout(timer);
    }
  }, [pending, state]);

  if (phase === 'settled') {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent">
        <CheckCheck className="size-3" />
        Paid
      </span>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={`relative h-6 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent hover:bg-accent/20 after:absolute after:-inset-2.5 after:content-['']${phase === 'celebrating' ? ' settle-celebration' : ''}`}
        disabled={pending || phase === 'celebrating'}
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
        {pending ? 'Marking…' : 'Paid'}
      </Button>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
