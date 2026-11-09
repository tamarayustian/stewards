'use client';

import { ArrowDownToLine, Check } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { settleAll } from '@/app/(app)/actions';
import { BannerCard } from '@/components/banner-card';
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
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      <Check className="size-4" />
      {pending ? 'Marking…' : 'Mark all as paid'}
    </Button>
  );
}

export function SettleUpCard({ youOwe, unsettledCount }: SettleUpCardProps) {
  return (
    <BannerCard
      icon={ArrowDownToLine}
      tone="primary"
      title="Settle up"
      message={
        <>
          You owe <span className="font-medium text-foreground">{youOwe}</span> across{' '}
          {unsettledCount} {unsettledCount === 1 ? 'expense' : 'expenses'}.
        </>
      }
      action={
        <form action={settleAll} className="w-full sm:w-auto">
          <SettleAllButton />
        </form>
      }
    />
  );
}
