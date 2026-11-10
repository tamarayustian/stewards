import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const tones = {
  open: { dot: 'bg-cobalt', text: 'text-ink' },
  part: { dot: 'bg-tangerine', text: 'text-ink' },
  settled: { dot: 'bg-line-strong', text: 'text-ink-muted' },
  pending: { dot: 'bg-line-strong', text: 'text-ink-muted' },
} as const;

const labels = {
  open: 'Open',
  part: 'Part paid',
  settled: 'Settled',
  pending: 'Pending',
} as const;

export function StatePill({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones;
  children?: ReactNode;
  className?: string;
}) {
  const style = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] border border-line-strong bg-paper px-2 py-1 font-mono text-[8px] font-medium tracking-[0.08em] uppercase',
        style.text,
        className,
      )}
    >
      <span className={cn('size-[5px] rounded-full', style.dot)} />
      {children ?? labels[tone]}
    </span>
  );
}
