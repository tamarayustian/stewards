'use client';

import { useSyncExternalStore } from 'react';

import { expenseDateAgo, formatExpenseDate } from '@/lib/expense-date';

const noopSubscribe = () => () => {};

/**
 * The relative label is measured against the viewer's local day, which only the
 * browser knows. Render the absolute date on the server and swap to the
 * viewer-local label after hydration, so neither paint is a hydration mismatch.
 */
export function RelativeDate({ date }: { date: Date }) {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => expenseDateAgo(date),
    () => formatExpenseDate(date),
  );
  return <>{label}</>;
}
