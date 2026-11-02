import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ErrorState({
  icon: Icon,
  tone = 'destructive',
  ghost,
  title,
  message,
  children,
}: {
  icon: LucideIcon;
  tone?: 'destructive' | 'primary';
  ghost?: string;
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {ghost ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-heading text-[clamp(9rem,34vw,22rem)] leading-none text-walnut/5"
        >
          {ghost}
        </span>
      ) : null}
      <div className="relative flex flex-col items-center text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]">
        <div
          className={cn(
            'mb-5 flex size-14 items-center justify-center rounded-full',
            tone === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'
          )}
        >
          <Icon
            className={cn('size-6', tone === 'destructive' ? 'text-destructive' : 'text-primary')}
            aria-hidden="true"
          />
        </div>
        <h1 className="font-heading text-3xl font-semibold text-balance text-walnut sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-[46ch] text-sm text-muted-foreground sm:text-base">{message}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div>
      </div>
    </>
  );
}
