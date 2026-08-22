import Link from 'next/link';

import { AddPhoneForm } from '@/components/add-phone-form';
import { CopyMessageButton } from '@/components/copy-message-button';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { RemindButton } from '@/components/remind-button';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Button } from '@/components/ui/button';
import { type PairSummary, type PairDetail } from '@/lib/balance-math';
import { type Currency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';
import { type ReminderRow } from '@/lib/balances';

export function BalanceList({
  reminders,
  rows,
  userCurrency,
}: {
  reminders: ReminderRow[];
  rows: { pair: PairSummary; detail: PairDetail | null }[];
  userCurrency: Currency;
}) {
  return (
    <>
      {reminders.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Reminders</h2>
            <MarkRemindersReadButton />
          </div>
          <ul className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{reminder.fromName}</span>{' '}
                    <span className="text-muted-foreground">
                      reminded you about {formatMoney(reminder.amountOwed, userCurrency)} across{' '}
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
                    render={<Link href={`/people/${reminder.fromId}`} />}
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
                        ? `${counterparty.name} owes you ${formatMoney(pair.net, userCurrency)}`
                        : `You owe ${counterparty.name} ${formatMoney(pair.net.abs(), userCurrency)}`}
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
                        viewerCurrency={userCurrency}
                      />
                    )}
                    {pair.amountOwedToMe.gt(0) && !counterparty.phone && detail && (
                      <>
                        <CopyMessageButton
                          name={counterparty.name}
                          items={detail.items}
                          viewerCurrency={userCurrency}
                        />
                        <AddPhoneForm userId={counterparty.id} />
                      </>
                    )}
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/people/${counterparty.id}`} />}
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
    </>
  );
}
