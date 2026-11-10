import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface RemindCardProps {
  youAreOwed: string;
  owedCount: number;
}

export function RemindCard({ youAreOwed, owedCount }: RemindCardProps) {
  return (
    <section className="border-t-2 border-tangerine px-4 py-5">
      <p className="eyebrow text-tangerine">Reminders</p>
      <h2 className="mt-2 font-heading text-[19px] font-bold tracking-[-0.02em] text-ink">
        Send a nudge.
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-body">
        <span className="font-medium text-ink">{youAreOwed}</span> owed to you across {owedCount}{' '}
        {owedCount === 1 ? 'expense' : 'expenses'}.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/people" />}
        variant="tang"
        className="mt-4 w-full"
      >
        Remind friends
      </Button>
    </section>
  );
}
