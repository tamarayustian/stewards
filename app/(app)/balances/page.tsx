import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AddPhoneForm } from '@/components/add-phone-form';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { RemindButton } from '@/components/remind-button';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Button } from '@/components/ui/button';
import { getPairBalances, getPairDetail, listReminders } from '@/lib/balances';
import { formatMoney } from '@/lib/money';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function BalancesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [pairs, reminders] = await Promise.all([getPairBalances(user.id), listReminders(user.id)]);

  const rows = await Promise.all(
    pairs.map(async (pair) => {
      const canWhatsApp = Boolean(pair.counterparty.phone) && pair.amountOwedToMe.gt(0);
      const detail = canWhatsApp ? await getPairDetail(user.id, pair.counterparty.id) : null;
      return { pair, detail };
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Balances</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What each person owes you and what you owe them.
        </p>
      </div>

      {reminders.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Reminders</h2>
            <MarkRemindersReadButton />
          </div>
          <ul className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{reminder.fromName}</span>{' '}
                    <span className="text-muted-foreground">
                      reminded you about {formatMoney(reminder.amountOwed)} across{' '}
                      {reminder.iOweCount} {reminder.iOweCount === 1 ? 'expense' : 'expenses'}.
                    </span>
                  </p>
                  {!reminder.readAt && (
                    <p className="mt-0.5 text-xs font-medium text-primary">Unread</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!reminder.readAt && <MarkRemindersReadButton fromId={reminder.fromId} />}
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/balances/${reminder.fromId}`} />}
                  >
                    View breakdown
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold">People</h2>
        {rows.length === 0 ? (
          <p className="mt-3 rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No outstanding balances yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {rows.map(({ pair, detail }) => {
              const { counterparty } = pair;
              return (
                <li
                  key={counterparty.id}
                  className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{counterparty.name}</p>
                    <p className={`text-sm ${pair.net.gt(0) ? 'text-accent' : 'text-destructive'}`}>
                      {pair.net.gt(0)
                        ? `${counterparty.name} owes you ${formatMoney(pair.net)}`
                        : `You owe ${counterparty.name} ${formatMoney(pair.net.abs())}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {pair.amountOwedToMe.gt(0) && counterparty.isRegistered && (
                      <RemindButton toId={counterparty.id} />
                    )}
                    {pair.amountOwedToMe.gt(0) && counterparty.phone && detail && (
                      <WhatsAppButton
                        name={counterparty.name}
                        phone={counterparty.phone}
                        items={detail.items}
                      />
                    )}
                    {pair.amountOwedToMe.gt(0) && !counterparty.phone && (
                      <AddPhoneForm userId={counterparty.id} />
                    )}
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/balances/${counterparty.id}`} />}
                    >
                      Details
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
