import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { deleteExpense } from '@/app/(app)/actions';
import { ConfirmAction } from '@/components/confirm-action';
import { Money } from '@/components/money';
import { PersonAvatar } from '@/components/person-avatar';
import { PillTabs } from '@/components/pill-tabs';
import { RelativeDate } from '@/components/relative-date';
import {
  MarkReceivedButton,
  MarkUnpaidButton,
  SettleExpenseButton,
} from '@/components/settle-expense-button';
import { StatePill } from '@/components/state-pill';
import { Button } from '@/components/ui/button';
import { formatExpenseDate } from '@/lib/expense-date';
import { type ActivityFilter, type ActivityItem } from '@/lib/expenses';

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'owe', label: 'You owe' },
  { key: 'owed', label: 'Owed to you' },
  { key: 'paid', label: 'Settled' },
];

type Variant = 'dashboard' | 'expenses' | 'group';

const columnClass: Record<Variant, string> = {
  dashboard: 'min-[1240px]:grid-cols-[22px_minmax(0,1fr)_110px_54px_96px_170px]',
  expenses: 'min-[1240px]:grid-cols-[84px_minmax(0,1.5fr)_140px_94px_94px_86px_170px]',
  group: 'min-[1240px]:grid-cols-[84px_minmax(0,1fr)_120px_94px_86px_170px]',
};

const headerCells: Record<Variant, string[]> = {
  dashboard: ['#', 'Expense', 'Amount', 'Ways', 'State', ''],
  expenses: ['Date', 'Expense', 'Paid by', 'Amount', 'Your share', 'State', ''],
  group: ['Date', 'Expense', 'Paid by', 'Amount', 'State', ''],
};

function emptyMessage(filter: ActivityFilter): string {
  if (filter === 'all') return 'No expenses yet — split one!';
  if (filter === 'owe') return "You're all settled up.";
  if (filter === 'owed') return 'No one owes you right now — nice!';
  return 'All settled — nothing pending.';
}

export function ActivityFeed({
  items,
  filter,
  variant = 'dashboard',
  showFilters = true,
  emptyAction,
}: {
  items: ActivityItem[];
  filter: ActivityFilter;
  variant?: Variant;
  showFilters?: boolean;
  emptyAction?: ReactNode;
}) {
  const headers = headerCells[variant];
  const isExpenses = variant === 'expenses';

  return (
    <>
      {showFilters && <PillTabs searchParam="filter" tabs={filterTabs} currentTab={filter} />}

      {items.length > 0 ? (
        <div className="mt-3 border-t border-line">
          <div
            className={`hidden border-b border-line py-2 min-[1240px]:grid min-[1240px]:items-center min-[1240px]:gap-3 ${columnClass[variant]}`}
          >
            {headers.map((label, index) => (
              <span key={`${label}-${index}`} className="eyebrow">
                {label}
              </span>
            ))}
          </div>

          {items.map((item, index) => {
            const amount = item.isPayer
              ? item.amount
              : item.unsettled
                ? item.myShare
                : item.shareAmount;
            const tone = !item.unsettled
              ? 'settled'
              : item.isPayer && item.hasSettled
                ? 'part'
                : 'open';

            return (
              <div
                key={item.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-line py-2.5 min-[1240px]:items-center min-[1240px]:gap-3 ${columnClass[variant]}`}
              >
                {variant === 'dashboard' ? (
                  <span className="num hidden text-[11px] text-ink-muted min-[1240px]:block">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : null}

                {isExpenses || variant === 'group' ? (
                  <span className="num hidden whitespace-nowrap text-[11px] text-ink-muted min-[1240px]:block">
                    {formatExpenseDate(item.occurredAt)}
                  </span>
                ) : null}

                <div className="min-w-0">
                  <p className="break-words text-[15px] font-medium text-ink">
                    {item.note ?? item.context}
                  </p>
                  <p className="mt-0.5 truncate text-[10.5px] text-ink-muted">
                    {item.isPayer ? 'You paid' : `${item.paidByName} paid`} · {item.context}
                    {isExpenses || variant === 'group' ? (
                      <span className="min-[1240px]:hidden">
                        {' '}
                        · {formatExpenseDate(item.occurredAt)}
                      </span>
                    ) : (
                      <> · <RelativeDate date={item.occurredAt} /></>
                    )}
                  </p>
                </div>

                {isExpenses || variant === 'group' ? (
                  <span className="hidden min-w-0 items-center gap-2 min-[1240px]:flex">
                    <PersonAvatar name={item.paidByName} size="xs" />
                    <span className="truncate text-[11px] text-body">
                      {item.isPayer ? 'You' : item.paidByName}
                    </span>
                  </span>
                ) : null}

                <Money
                  amount={amount}
                  currency={item.currency}
                  className="justify-self-end text-right text-[12.5px] text-ink min-[1240px]:justify-self-start min-[1240px]:text-[13px]"
                />

                {isExpenses ? (
                  item.isPayer ? (
                    <span className="hidden text-right text-[12px] text-ink-muted min-[1240px]:block">
                      —
                    </span>
                  ) : (
                    <Money
                      amount={item.unsettled ? item.myShare : item.shareAmount}
                      currency={item.currency}
                      className="hidden text-right text-[12px] text-body min-[1240px]:block"
                    />
                  )
                ) : null}

                {variant === 'dashboard' ? (
                  <span className="hidden text-[10px] text-ink-muted min-[1240px]:block">
                    {item.participantCount} {item.participantCount === 1 ? 'way' : 'ways'}
                  </span>
                ) : null}

                <StatePill
                  tone={tone}
                  className="col-start-2 justify-self-end min-[1240px]:col-start-auto min-[1240px]:justify-self-start"
                >
                  {tone === 'settled' ? 'Settled' : tone === 'part' ? 'Part paid' : 'Open'}
                </StatePill>

                <div className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 min-[1240px]:col-start-auto min-[1240px]:flex-nowrap min-[1240px]:justify-end min-[1240px]:pt-0">
                  {!item.isPayer && item.unsettled && item.myShare.gt(0) && (
                    <SettleExpenseButton expenseId={item.id} />
                  )}
                  {!item.isPayer && !item.unsettled && item.hasSettled && (
                    <MarkUnpaidButton expenseId={item.id} />
                  )}
                  {item.isPayer && item.unsettled && item.borrowerId && (
                    <MarkReceivedButton expenseId={item.id} splitUserId={item.borrowerId} />
                  )}
                  {item.isPayer && item.unsettled && !item.borrowerId && (
                    <Link
                      href="/people"
                      className="text-[10px] font-medium uppercase tracking-[0.08em] text-cobalt underline-offset-4 hover:underline"
                    >
                      Remind
                    </Link>
                  )}
                  <Button
                    nativeButton={false}
                    render={<Link href={`/expenses/${item.id}/edit`} />}
                    variant="ghost"
                    size="icon-sm"
                    className="text-ink-muted hover:text-ink"
                    title="Edit expense"
                    aria-label="Edit expense"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <ConfirmAction
                    action={deleteExpense}
                    fields={[{ name: 'expenseId', value: item.id }]}
                    title="Delete this expense?"
                    description="The expense and its splits will be hidden from you and everyone else."
                    confirmLabel="Delete"
                    pendingLabel="Deleting…"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-rust hover:bg-rust/5 hover:text-rust"
                        title="Delete expense"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 border-y border-line px-4 py-10 text-center">
          <p className="eyebrow">{filter === 'all' ? 'No entries' : 'Nothing here'}</p>
          <p className="mt-2 text-[13px] text-body">{emptyMessage(filter)}</p>
          {emptyAction ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">{emptyAction}</div>
          ) : null}
        </div>
      )}
    </>
  );
}
