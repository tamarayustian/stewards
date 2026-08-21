import { MessageCircle, Pencil, ReceiptText, Users } from 'lucide-react';
import Link from 'next/link';

import { DeleteExpenseButton } from '@/components/delete-expense-button';
import { MarkUnpaidButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type ActivityFilter, type ActivityItem } from '@/lib/expenses';
import { type Currency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const tabs: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'owe', label: 'You owe' },
  { key: 'owed', label: 'Owed to you' },
  { key: 'paid', label: 'Settled' },
];

export function ActivityFeed({
  items,
  filter,
  basePath = '/dashboard',
}: {
  items: ActivityItem[];
  filter: ActivityFilter;
  basePath?: string;
}) {
  return (
    <>
      <div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
        {tabs.map((f) => (
          <Link
            key={f.key}
            href={`${basePath}${f.key === 'all' ? '' : `${basePath.includes('?') ? '&' : '?'}filter=${f.key}`}`}
            className={`relative rounded-md px-3 py-1 text-xs font-medium after:absolute after:-inset-y-2 after:-inset-x-1 after:content-[''] ${
              filter === f.key
                ? 'bg-card text-foreground ring-1 ring-foreground/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={filter === f.key ? 'page' : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {items.length > 0 ? (
        <div className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    item.isPayer ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <ReceiptText
                    className={`size-4 ${item.isPayer ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.note ?? item.context}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.isPayer ? 'You paid' : `${item.paidByName} paid`} · {item.context} ·{' '}
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {formatMoney(
                      item.isPayer ? item.amount : item.myShare,
                      item.currency as Currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.isPayer
                      ? `split ${item.participantCount} ${item.participantCount === 1 ? 'way' : 'ways'}`
                      : `share of ${formatMoney(item.amount, item.currency as Currency)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-12 sm:pl-0">
                {!item.isPayer && item.unsettled && item.myShare.gt(0) && (
                  <SettleExpenseButton expenseId={item.id} />
                )}
                {!item.isPayer && !item.unsettled && item.hasSettled && (
                  <MarkUnpaidButton expenseId={item.id} />
                )}
                {item.isPayer && item.unsettled && (
                  <Link
                    href="/activity?view=people"
                    className="inline-flex h-6 items-center gap-1 rounded-full bg-accent/10 px-2 text-xs font-medium text-accent hover:bg-accent/20"
                  >
                    <MessageCircle className="size-3" />
                    Remind
                  </Link>
                )}
                <Button
                  nativeButton={false}
                  render={<Link href={`/expenses/${item.id}/edit`} />}
                  variant="outline"
                  size="icon"
                  className="relative size-7 after:absolute after:-inset-1 after:content-['']"
                  title="Edit expense"
                  aria-label="Edit expense"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <DeleteExpenseButton expenseId={item.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="mt-3">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground">
                {filter === 'all'
                  ? 'No expenses yet — split one!'
                  : filter === 'owe'
                    ? "You're all settled up."
                    : filter === 'owed'
                      ? 'No one owes you right now — nice!'
                      : 'All settled — nothing pending.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
