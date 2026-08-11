import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Plus,
  ReceiptText,
  UserPlus,
  Users,
} from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteExpenseButton } from '@/components/delete-expense-button';
import { MarkUnpaidButton, SettleExpenseButton } from '@/components/settle-expense-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import db from '@/lib/db';
import { getActivity, getBalances, type ActivityFilter } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { createServerClientReadOnly } from '@/lib/supabase';

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { filter: filterParam } = await searchParams;
  const filter: ActivityFilter =
    filterParam === 'owe' || filterParam === 'owed' || filterParam === 'paid' ? filterParam : 'all';

  const [profile, balances, allActivity, filteredActivity] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    }),
    getBalances(user.id),
    getActivity(user.id),
    filter === 'all' ? null : getActivity(user.id, filter),
  ]);
  const activity = filteredActivity ?? allActivity;

  const displayName = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'User';
  const hasActivity = allActivity.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{profile?.email}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/expenses/new" />}>
          <Plus className="size-4" />
          Add an expense
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
              <ArrowUpFromLine className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You owe</p>
              <p className="text-lg font-semibold text-destructive">
                {formatMoney(balances.youOwe)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
              <ArrowDownToLine className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You are owed</p>
              <p className="text-lg font-semibold text-accent">
                {formatMoney(balances.youAreOwed)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        “You owe” is your share of expenses others paid; “You are owed” is others’ shares of
        expenses you paid.
      </p>

      <div>
        <h2 className="text-base font-semibold">Recent activity</h2>
        {hasActivity ? (
          <>
            <div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'owe', label: 'You owe' },
                { key: 'owed', label: 'Owed to you' },
                { key: 'paid', label: 'Paid' },
              ].map((f) => (
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
            {activity.length > 0 ? (
              <div className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        item.isPayer ? 'bg-primary/10' : 'bg-muted'
                      }`}
                    >
                      <ReceiptText
                        className={`size-4 ${
                          item.isPayer ? 'text-primary' : 'text-muted-foreground'
                        }`}
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
        ) : (
          <Card className="mt-3">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No expenses yet</p>
                <p className="text-sm text-muted-foreground">
                  Split your first cost with a group or directly with friends.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Button nativeButton={false} render={<Link href="/expenses/new" />}>
                  <Plus className="size-4" />
                  Add an expense
                </Button>
                <Button nativeButton={false} render={<Link href="/settings" />} variant="outline">
                  <UserPlus className="size-4" />
                  Invite friends
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
