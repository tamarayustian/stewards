import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PageHead({
  eyebrow,
  title,
  sub,
  meta,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  sub?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="font-heading text-[clamp(34px,4vw,47px)] leading-none font-extrabold tracking-[-0.05em] text-ink">
          {title}
        </h1>
        {sub ? (
          <div className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-body">{sub}</div>
        ) : null}
      </div>
      {meta || actions ? (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {meta ? <div className="eyebrow text-ink-muted">{meta}</div> : null}
          {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
