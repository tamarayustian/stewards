import { ArrowDownToLine, Check } from 'lucide-react';

import { settleAll } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SettleUpCardProps {
  youOwe: string;
  unsettledCount: number;
}

export function SettleUpCard({ youOwe, unsettledCount }: SettleUpCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ArrowDownToLine className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Settle up</p>
            <p className="text-sm text-muted-foreground">
              You owe <span className="font-medium text-foreground">{youOwe}</span> across{' '}
              {unsettledCount} {unsettledCount === 1 ? 'expense' : 'expenses'}.
            </p>
          </div>
        </div>
        <form action={settleAll}>
          <Button type="submit" className="w-full sm:w-auto">
            <Check className="size-4" />
            Mark all paid
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
