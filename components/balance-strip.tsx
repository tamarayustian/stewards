import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type BalanceItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'hot';
  action?: ReactNode;
};

export function BalanceStrip({ items, className }: { items: BalanceItem[]; className?: string }) {
  return (
    <div className={cn('grid border-y-2 border-ink sm:grid-flow-col sm:auto-cols-fr', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-line px-4 py-4 first:pl-0 last:pr-0 sm:border-l sm:first:border-l-0 sm:first:pl-4"
        >
          <div className="eyebrow text-cobalt">{item.label}</div>
          <div
            className={cn(
              'num text-[30px] leading-none font-medium tracking-[-0.04em]',
              item.tone === 'hot' ? 'text-tangerine' : 'text-ink',
            )}
          >
            {item.value}
          </div>
          {item.detail ? <div className="text-[10.5px] text-ink-muted">{item.detail}</div> : null}
          {item.action ? <div className="pt-1">{item.action}</div> : null}
        </div>
      ))}
    </div>
  );
}
