'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function PillTabs({
  searchParam,
  tabs,
  currentTab,
  baseUrl,
}: {
  searchParam: string;
  tabs: { key: string; label: string }[];
  currentTab: string;
  baseUrl?: string;
}) {
  const pathname = usePathname();
  const base = baseUrl || pathname;

  function hrefFor(key: string) {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${searchParam}=${key}`;
  }

  return (
    <div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab.key)}
          className={cn(
            'rounded-md px-3 py-2 min-h-11 text-xs font-medium md:min-h-0 md:py-1 relative z-10',
            currentTab === tab.key
              ? 'bg-card text-foreground ring-1 ring-foreground/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-current={currentTab === tab.key ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
