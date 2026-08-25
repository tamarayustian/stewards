import { ArrowDownToLine, Check } from 'lucide-react';

import { settleAll } from '@/app/(app)/actions';
import { BannerCard } from '@/components/banner-card';
import { Button } from '@/components/ui/button';

interface SettleUpCardProps {
  youOwe: string;
  unsettledCount: number;
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
        <form action={settleAll}>
          <Button type="submit" className="w-full sm:w-auto">
            <Check className="size-4" />
            Mark all as paid
          </Button>
        </form>
      }
    />
  );
}
