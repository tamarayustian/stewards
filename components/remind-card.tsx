import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { BannerCard } from '@/components/banner-card';
import { Button } from '@/components/ui/button';

interface RemindCardProps {
  youAreOwed: string;
  owedCount: number;
}

export function RemindCard({ youAreOwed, owedCount }: RemindCardProps) {
  return (
    <BannerCard
      icon={MessageCircle}
      tone="accent"
      title="Send a reminder"
      message={
        <>
          <span className="font-medium text-foreground">{youAreOwed}</span> owed to you across{' '}
          {owedCount} {owedCount === 1 ? 'expense' : 'expenses'}.
        </>
      }
      action={
        <Button nativeButton={false} render={<Link href="/people" />}>
          <MessageCircle className="size-4" />
          Remind friends
        </Button>
      }
    />
  );
}
