'use client';

import { Check, CheckCheck, HandCoins } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';

import { settleExpense, unsettleExpense } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';

type Phase = 'idle' | 'celebrating' | 'settled';

type UnsettleState = Awaited<ReturnType<typeof unsettleExpense>> | undefined;

/**
 * Names the scope of an unwind. Reversing one share can erase whole payments and
 * reopen the other shares they were covering, so that has to be said out loud.
 */
function unsettleTitle(result: {
  settlementsClosed: number;
  otherSplitsReleased: number;
  reopened: boolean;
}): string {
  const { settlementsClosed, otherSplitsReleased, reopened } = result;
  if (settlementsClosed <= 1 && otherSplitsReleased === 0 && reopened) {
    return 'Marked unpaid';
  }

  const payments = `${settlementsClosed} payment${settlementsClosed === 1 ? '' : 's'}`;
  const parts = [`Reversed ${payments}`];
  if (otherSplitsReleased > 0) {
    parts.push(
      `${otherSplitsReleased} other share${otherSplitsReleased === 1 ? '' : 's'} reopened`,
    );
  }
  if (!reopened) {
    parts.push('this share is still covered');
  }
  return parts.join(' — ');
}

function SettleChip({
  expenseId,
  splitUserId,
  icon: Icon,
  label,
  settledLabel,
  title,
}: {
  expenseId: string;
  splitUserId?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  settledLabel: string;
  title: string;
}) {
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
        {settledLabel}
      </span>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      {splitUserId && <input type="hidden" name="splitUserId" value={splitUserId} />}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={`relative h-6 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent hover:bg-accent/20 after:absolute after:-inset-1.5 after:content-['']${phase === 'celebrating' ? ' settle-celebration' : ''}`}
        disabled={pending || phase === 'celebrating'}
        title={title}
      >
        <Icon className="size-3" />
        {pending ? 'Marking…' : label}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}

export function SettleExpenseButton({ expenseId }: { expenseId: string }) {
  return (
    <SettleChip
      expenseId={expenseId}
      icon={Check}
      label="Mark paid"
      settledLabel="Paid"
      title="Mark this share as paid"
    />
  );
}

export function MarkReceivedButton({
  expenseId,
  splitUserId,
}: {
  expenseId: string;
  splitUserId: string;
}) {
  return (
    <SettleChip
      expenseId={expenseId}
      splitUserId={splitUserId}
      icon={HandCoins}
      label="Mark received"
      settledLabel="Received"
      title="Mark this share as received"
    />
  );
}

export function MarkUnpaidButton({
  expenseId,
  splitUserId,
}: {
  expenseId: string;
  splitUserId?: string;
}) {
  const { toast } = useToast();
  // Toast from inside the action: the chip is replaced as soon as the page
  // revalidates, so an effect on the new state may never get to run.
  const [state, action, pending] = useActionState<UnsettleState, FormData>(
    async (_prev, formData) => {
      const result = await unsettleExpense(undefined, formData);
      if (!('error' in result)) {
        const scoped = result.settlementsClosed > 1 || result.otherSplitsReleased > 0;
        toast({ title: unsettleTitle(result), variant: scoped ? 'info' : 'success' });
      }
      return result;
    },
    undefined,
  );
  const error = state && 'error' in state ? state.error : undefined;

  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      {splitUserId && <input type="hidden" name="splitUserId" value={splitUserId} />}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="relative h-6 rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground after:absolute after:-inset-1.5 after:content-['']"
        disabled={pending}
        title="Mark this share as unpaid"
      >
        <CheckCheck className="size-3" />
        {pending ? 'Marking…' : 'Paid'}
      </Button>
      <FormError message={error} />
    </form>
  );
}
