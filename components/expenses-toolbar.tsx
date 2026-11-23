'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PillTabs } from '@/components/pill-tabs';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ActivityFilter } from '@/lib/expense-search';

interface ExpensesToolbarProps {
  query: string;
  group: string;
  filter: ActivityFilter;
  counts: Record<ActivityFilter, number>;
  groups: { id: string; name: string }[];
  shown: number;
  total: number;
}

export function ExpensesToolbar({
  query,
  group,
  filter,
  counts,
  groups,
  shown,
  total,
}: ExpensesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = search.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      router.replace(`?${next.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query, router, searchParams]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="mt-4 border-y border-line py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={80}
            placeholder="Search expenses"
            aria-label="Search expenses"
            autoComplete="off"
            className="sm:w-60"
          />
          <Select
            value={group}
            onChange={(event) =>
              setParam('group', event.target.value === 'all' ? null : event.target.value)
            }
            aria-label="Filter by group"
            className="sm:w-44"
          >
            <option value="all">All expenses</option>
            <option value="direct">Direct only</option>
            {groups.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </div>
        <span className="eyebrow whitespace-nowrap">
          Showing {shown} of {total}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <PillTabs
          className="mt-0"
          searchParam="filter"
          currentTab={filter}
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'owe', label: 'You owe', count: counts.owe },
            { key: 'owed', label: 'Owed to you', count: counts.owed },
            { key: 'paid', label: 'Settled', count: counts.paid },
          ]}
        />
      </div>
    </div>
  );
}
