'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { settleExpense, unsettleExpense } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';

type Phase = 'idle' | 'celebrating' | 'settled';

type UnsettleState = Awaited<ReturnType<typeof unsettleExpense>> | undefined;

/**
 * Names the scope of an unwind. Reversing one share can erase whole payments and
 * release the other shares they were covering, so that has to be said out loud.
 * Only the tapped share's outcome is verified after the rebuild, so other shares
 * are reported as released, never as reopened.
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

  const payments =
    settlementsClosed === 1 ? 'Payment reversed' : `${settlementsClosed} payments reversed`;
  const parts = [payments];
  if (otherSplitsReleased > 0) {
    // Released, not reopened: only the tapped share's state is verified after
    // the rebuild.
    parts.push(
      `${otherSplitsReleased} other share${otherSplitsReleased === 1 ? '' : 's'} released`,
    );
  }
  if (!reopened) {
    parts.push('this share is still covered');
  }
  return parts.join(' · ');
}

function SettleChip({
  expenseId,
  splitUserId,
  label,
  settledLabel,
  title,
}: {
  expenseId: string;
  splitUserId?: string;
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
      <span className="inline-flex h-6 items-center gap-1.5 rounded-[4px] border border-line-strong bg-paper px-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        <span className="size-1.5 rounded-full bg-line-strong" aria-hidden="true" />
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
        className={`relative h-6 rounded-[4px] border border-line-strong bg-paper px-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-sage hover:bg-tint hover:text-cobalt-deep after:absolute after:-inset-1.5 after:content-['']${phase === 'celebrating' ? ' settle-celebration' : ''}`}
        disabled={pending || phase === 'celebrating'}
        title={title}
      >
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
        className="relative h-6 rounded-[4px] border border-line-strong bg-transparent px-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-muted hover:bg-soft hover:text-ink after:absolute after:-inset-1.5 after:content-['']"
        disabled={pending}
        title="Mark this share as unpaid"
      >
        {pending ? 'Marking…' : 'Paid'}
      </Button>
      <FormError message={error} />
    </form>
  );
}
