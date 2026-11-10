'use client';

import { useFormStatus } from 'react-dom';

import { settleAll } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

interface SettleUpCardProps {
  youOwe: string;
  unsettledCount: number;
}

// `useFormStatus` must run in a child of the form, so the pending state lives
// here. Two overlapping taps would each record a payment: the server serialises
// them, but the disabled button keeps the common case from firing twice at all.
function SettleAllButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="tang" className="w-full" disabled={pending}>
      {pending ? 'Marking…' : 'Mark all as paid'}
    </Button>
  );
}

export function SettleUpCard({ youOwe, unsettledCount }: SettleUpCardProps) {
  return (
    <section className="border-t-2 border-cobalt px-4 py-5">
      <p className="eyebrow text-cobalt">Settlement</p>
      <h2 className="mt-2 font-heading text-[19px] font-bold tracking-[-0.02em] text-ink">
        Clear the table.
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-body">
        You owe <span className="font-medium text-ink">{youOwe}</span> across {unsettledCount}{' '}
        {unsettledCount === 1 ? 'expense' : 'expenses'}.
      </p>
      <form action={settleAll} className="mt-4">
        <SettleAllButton />
      </form>
    </section>
  );
}
