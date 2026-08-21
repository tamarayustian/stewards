import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RemindCardProps {
  youAreOwed: string;
  owedCount: number;
}

export function RemindCard({ youAreOwed, owedCount }: RemindCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <MessageCircle className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">Send a reminder</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{youAreOwed}</span> owed to you across{' '}
              {owedCount} {owedCount === 1 ? 'expense' : 'expenses'}.
            </p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href="/people" />}>
          <MessageCircle className="size-4" />
          Remind friends
        </Button>
      </CardContent>
    </Card>
  );
}
