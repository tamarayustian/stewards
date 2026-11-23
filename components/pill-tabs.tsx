'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

export function PillTabs({
  searchParam,
  tabs,
  currentTab,
  variant = 'pill',
  className,
}: {
  searchParam: string;
  tabs: { key: string; label: string; count?: number }[];
  currentTab: string;
  variant?: 'pill' | 'lens';
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLens = variant === 'lens';

  const setTab = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(searchParam, key);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams, searchParam],
  );

  return (
    <div
      className={cn(
        'mt-3 inline-flex w-fit rounded-full p-0.5',
        isLens ? 'border border-line-strong' : 'bg-soft',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setTab(tab.key)}
          className={cn(
            'relative z-10 inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors md:min-h-0',
            currentTab === tab.key
              ? isLens
                ? 'bg-ink text-paper'
                : 'bg-paper text-ink ring-1 ring-line-strong'
              : 'text-ink-muted hover:text-ink',
          )}
          aria-current={currentTab === tab.key ? 'page' : undefined}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className="num ml-1.5 text-[10px] opacity-70">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
