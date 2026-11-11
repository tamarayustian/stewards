import Link from 'next/link';

import { CounterpartyActions } from '@/components/counterparty-actions';
import { MarkRemindersReadButton } from '@/components/mark-reminders-read-button';
import { Money } from '@/components/money';
import { PersonAvatar } from '@/components/person-avatar';
import { SectionLine } from '@/components/section-line';
import { StatePill } from '@/components/state-pill';
import { type PairSummary, type PairDetail } from '@/lib/balance-math';
import { type Currency } from '@/lib/currencies';
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
        <SectionLine title="Reminders" action={<MarkRemindersReadButton />}>
          <ul className="border-t border-line">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="grid gap-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[15px]">
                    <span className="font-medium text-ink">{reminder.fromName}</span>{' '}
                    <span className="text-body">
                      reminded you about{' '}
                      <Money amount={reminder.amountOwed} currency={userCurrency} /> across{' '}
                      {reminder.iOweCount} {reminder.iOweCount === 1 ? 'expense' : 'expenses'}.
                    </span>
                  </p>
                  {!reminder.readAt && <p className="eyebrow mt-1 text-cobalt">Unread</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-4">
                  {!reminder.readAt && <MarkRemindersReadButton fromId={reminder.fromId} />}
                  <Link
                    href={`/people/${reminder.fromId}`}
                    className="text-[10px] font-medium uppercase tracking-[0.12em] text-cobalt underline underline-offset-4"
                  >
                    View breakdown
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </SectionLine>
      )}

      <SectionLine title="People">
        {rows.length === 0 ? (
          <div className="border-y border-line px-4 py-10 text-center">
            <p className="eyebrow">Nothing here</p>
            <p className="mt-2 text-[13px] text-ink-muted">No outstanding balances yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.45fr)_104px_110px_250px] items-center gap-3 border-b border-line py-2 lg:grid">
              {['Person', 'Direction', 'Net', 'Action'].map((label) => (
                <span key={label} className="eyebrow">
                  {label}
                </span>
              ))}
            </div>
            <ul className="border-b border-line">
              {rows.map(({ pair, detail }) => {
                const { counterparty } = pair;
                return (
                  <li
                    key={counterparty.id}
                    className="grid gap-3 border-b border-line py-3 last:border-b-0 lg:grid-cols-[minmax(0,1.45fr)_104px_110px_250px] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar name={counterparty.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">
                          {counterparty.name}
                        </p>
                        <p className="text-[10.5px] text-ink-muted">
                          {counterparty.isRegistered ? 'Registered contact' : 'Direct'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <StatePill tone={pair.net.gt(0) ? 'open' : 'part'}>
                        {pair.net.gt(0) ? 'Owes you' : 'You owe'}
                      </StatePill>
                    </div>
                    <div className="lg:text-right">
                      <Money
                        amount={pair.net.abs()}
                        currency={userCurrency}
                        className="text-[14.5px] text-ink"
                      />
                    </div>
                    <div className="flex flex-col items-start gap-1.5 lg:items-end">
                      <CounterpartyActions
                        hasOwedToMe={pair.amountOwedToMe.gt(0) && !!detail}
                        counterparty={pair.counterparty}
                        items={detail?.items ?? []}
                        viewerCurrency={userCurrency}
                      >
                        <Link
                          href={`/people/${counterparty.id}`}
                          className="text-[10px] font-medium uppercase tracking-[0.12em] text-cobalt underline underline-offset-4"
                        >
                          Details
                        </Link>
                      </CounterpartyActions>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionLine>
    </>
  );
}
