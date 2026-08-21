import { ArrowLeft } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AddPhoneForm } from '@/components/add-phone-form';
import { CopyMessageButton } from '@/components/copy-message-button';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { RemindButton } from '@/components/remind-button';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Button } from '@/components/ui/button';
import { getPairDetail, listReminders } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function BalanceDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [detail, reminders] = await Promise.all([
    getPairDetail(user.id, userId),
    listReminders(user.id),
  ]);

  if (!detail) {
    redirect('/people');
  }

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const userCurrency = (profile?.currency ?? 'HKD') as Currency;

  const unreadFromThem = reminders.some((r) => r.fromId === userId && !r.readAt);
  const { counterparty } = detail;

  return (
    <div className="space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/people" />}
        className="gap-1.5"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{counterparty.name}</h1>
          <p
            className={`mt-0.5 text-lg font-semibold ${
              detail.net.gt(0)
                ? 'text-accent'
                : detail.net.isZero()
                  ? 'text-muted-foreground'
                  : 'text-destructive'
            }`}
          >
            {detail.net.gt(0)
              ? `${counterparty.name} owes you ${formatMoney(detail.net, userCurrency)}`
              : detail.net.isZero()
                ? 'All settled'
                : `You owe ${counterparty.name} ${formatMoney(detail.net.abs(), userCurrency)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detail.amountOwedToMe.gt(0) && counterparty.isRegistered && (
            <RemindButton toId={counterparty.id} />
          )}
          {detail.amountOwedToMe.gt(0) && counterparty.phone && (
            <WhatsAppButton
              name={counterparty.name}
              phone={counterparty.phone}
              items={detail.items}
              viewerCurrency={userCurrency}
            />
          )}
          {detail.amountOwedToMe.gt(0) && !counterparty.phone && (
            <>
              <CopyMessageButton
                name={counterparty.name}
                items={detail.items}
                viewerCurrency={userCurrency}
              />
              <AddPhoneForm userId={counterparty.id} />
            </>
          )}
          {detail.amountOwedToMe.gt(0) && unreadFromThem && (
            <MarkRemindersReadButton fromId={counterparty.id} />
          )}
        </div>
      </div>

      <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {detail.items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing to settle.
          </li>
        ) : (
          detail.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.note ?? 'Expense'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-HK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(item.date)}{' '}
                  · {item.direction === 'theyOweMe' ? 'You paid' : 'They paid'}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">
                {item.direction === 'theyOweMe'
                  ? formatMoney(item.theirShare, item.currency)
                  : formatMoney(item.myShare, item.currency)}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
