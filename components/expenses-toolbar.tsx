'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PillTabs } from '@/components/pill-tabs';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { mergeExpenseSearchParams, type ActivityFilter } from '@/lib/expense-search';

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
  const [search, setSearch] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  const [lastSubmitted, setLastSubmitted] = useState(query);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (query !== lastQuery) {
    setLastQuery(query);
    if (query !== lastSubmitted) {
      setLastSubmitted(query);
      setSearch(query);
    }
  }

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const navigate = useCallback(
    (draft: string, patch: { group?: string | null; filter?: string | null }) => {
      clearTimer();
      const trimmed = draft.trim();
      setLastSubmitted(trimmed);
      const next = mergeExpenseSearchParams(new URLSearchParams(window.location.search), {
        q: trimmed,
        ...patch,
      });
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [clearTimer, router],
  );

  useEffect(() => {
    if (search === query) return;
    clearTimer();
    timer.current = setTimeout(() => navigate(search, {}), 300);
    return clearTimer;
  }, [search, query, clearTimer, navigate]);

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
              navigate(search, {
                group: event.target.value === 'all' ? null : event.target.value,
              })
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
          onSelect={(key) => navigate(search, { filter: key === 'all' ? null : key })}
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
