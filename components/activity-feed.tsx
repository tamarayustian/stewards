import { Pencil, ReceiptText, Users } from 'lucide-react';
import Link from 'next/link';

import { DeleteExpenseButton } from '@/components/delete-expense-button';
import { MarkUnpaidButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type ActivityFilter, type ActivityItem } from '@/lib/expenses';
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
  { key: 'paid', label: 'Paid' },
];

export function ActivityFeed({ items, filter }: { items: ActivityItem[]; filter: ActivityFilter }) {
  return (
    <>
      <div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
        {tabs.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/dashboard' : `/dashboard?filter=${f.key}`}
            className={`relative rounded-md px-3 py-1 text-xs font-medium after:absolute after:-inset-2 after:content-[''] ${
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
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
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
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.note ?? item.context}
                  </p>
                  {!item.isPayer && item.unsettled && item.myShare.gt(0) && (
                    <span className="shrink-0">
                      <SettleExpenseButton expenseId={item.id} />
                    </span>
                  )}
                  {!item.isPayer && !item.unsettled && item.hasSettled && (
                    <span className="shrink-0">
                      <MarkUnpaidButton expenseId={item.id} />
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {item.isPayer ? 'You paid' : `${item.paidByName} paid`} · {item.context} ·{' '}
                  {timeAgo(item.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatMoney(item.isPayer ? item.amount : item.myShare)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.isPayer
                    ? `split ${item.participantCount} ${item.participantCount === 1 ? 'way' : 'ways'}`
                    : `share of ${formatMoney(item.amount)}`}
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href={`/expenses/${item.id}/edit`} />}
                variant="outline"
                size="icon"
                className="relative size-7 after:absolute after:-inset-2 after:content-['']"
                title="Edit expense"
                aria-label="Edit expense"
              >
                <Pencil className="size-3.5" />
              </Button>
              <DeleteExpenseButton expenseId={item.id} />
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
              <p className="font-medium">Nothing here</p>
              <p className="text-sm text-muted-foreground">
                {filter === 'owe'
                  ? "You don't owe anything right now."
                  : filter === 'owed'
                    ? 'No one owes you right now.'
                    : 'No settled expenses yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
