'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

export function PillTabs({
  searchParam,
  tabs,
  currentTab,
}: {
  searchParam: string;
  tabs: { key: string; label: string }[];
  currentTab: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(searchParam, key);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams, searchParam],
  );

  return (
    <div className="mt-3 inline-flex w-fit rounded-full bg-soft p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setTab(tab.key)}
          className={cn(
            'relative z-10 inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors md:min-h-0',
            currentTab === tab.key
              ? 'bg-paper text-ink ring-1 ring-line-strong'
              : 'text-ink-muted hover:text-ink',
          )}
          aria-current={currentTab === tab.key ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
