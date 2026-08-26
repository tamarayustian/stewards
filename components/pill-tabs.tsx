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
    <div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setTab(tab.key)}
          className={cn(
            'rounded-md px-3 py-2 min-h-11 text-xs font-medium md:min-h-0 md:py-1 relative z-10 inline-flex items-center',
            currentTab === tab.key
              ? 'bg-card text-foreground ring-1 ring-foreground/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-current={currentTab === tab.key ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
