import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SectionLine({
  title,
  meta,
  action,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-t border-ink pt-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-[16px] leading-tight font-bold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {meta ? <span className="eyebrow">{meta}</span> : null}
          {action}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
