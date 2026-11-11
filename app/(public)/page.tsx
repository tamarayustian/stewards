import Link from 'next/link';

import { Money } from '@/components/money';
import { PersonAvatar } from '@/components/person-avatar';
import { Button } from '@/components/ui/button';
import { moneyParts } from '@/lib/money';

const people = [
  { name: 'Alex', amount: '194.77' },
  { name: 'Sam', amount: '186.20' },
  { name: 'Pip', amount: '120.44' },
  { name: 'Charissa', amount: '−188.20', negative: true },
];

const statement = [
  ['01', 'One ledger, every expense'],
  ['02', '12 currencies, live rates'],
  ['03', 'Settle without an account'],
];

const ledgerRows = [
  { note: 'Yat Lok · roast goose', meta: 'You paid · 4 ways', total: 1059, share: '264.75', state: 'Open' },
  { note: 'Uber · LKF', meta: 'You paid · 3 ways', total: 276, share: '69.00', state: 'Open' },
  { note: 'Wing Wah · dinner', meta: 'Alex paid · 3 ways', total: 440, share: '146.67', state: 'Settled' },
  { note: '3rd Space · flat white', meta: 'Sam paid · 2 ways', total: 150, share: '75.00', state: 'Open' },
];

const steps = [
  {
    number: '01',
    title: 'Add the expense',
    body: 'Amount, payer, who was there. One screen, no spreadsheet archaeology.',
  },
  {
    number: '02',
    title: 'We do the split',
    body: 'Equal shares to the cent, with the remainder handled so the total still balances.',
  },
  {
    number: '03',
    title: 'Settle once',
    body: 'One reminder, one set of transfers, everyone square. No account needed on their side.',
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-[1320px] gap-16 px-5 pt-16 pb-20 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:pt-24">
        <div>
          <p className="eyebrow">Split expenses · kept properly</p>
          <h1 className="mt-5 text-balance font-heading text-[clamp(54px,7.1vw,94px)] leading-[0.92] font-extrabold tracking-[-0.055em] text-ink">
            Keep the tab.
            <br />
            Keep the{' '}
            <span className="relative inline-block">
              friends.
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[5px] w-full -rotate-1 bg-tangerine"
              />
            </span>
          </h1>
          <p className="mt-7 max-w-[46ch] text-[17px] leading-[1.6] text-body">
            Stewards splits shared costs, keeps a clean ledger, and turns a pile of IOUs into{' '}
            <strong className="font-semibold text-ink">one honest number</strong>. Built for the
            Sunday table, the flat and the trip that never quite ended.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Start a tab
            </Button>
            <Link
              href="/login"
              className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-cobalt hover:underline"
            >
              See a live tab
            </Link>
          </div>
          <p className="mt-10 font-mono text-[9px] uppercase leading-[1.9] tracking-[0.14em] text-ink-muted">
            No spreadsheets. No group-chat archaeology.
            <br />
            No account needed to settle.
          </p>
        </div>

        <div
          id="ledger-section"
          className="relative scroll-mt-8 border border-line-strong bg-paper py-6 pr-6 pl-7 shadow-[0_30px_60px_-46px_rgba(18,19,26,0.55)] sm:pl-8"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[9px] bg-cobalt" />
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-heading text-[15px] font-bold tracking-[-0.02em]">The tab · open</span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-muted">
              4 friends
            </span>
          </div>

          <p className="mt-7 font-mono text-[8px] uppercase tracking-[0.16em] text-cobalt">
            Owed to you
          </p>
          <Money amount={501.41} className="mt-1 text-[43px] leading-none text-tangerine" />
          <p className="mt-1 text-[10.5px] text-ink-muted">across three people</p>

          <ul className="mt-6 border-t border-line">
            {people.map((person) => (
              <li key={person.name} className="flex items-center gap-2.5 border-b border-line py-2.5">
                <PersonAvatar name={person.name} size="xs" />
                <span className="text-[13px] font-medium text-ink">{person.name}</span>
                <span
                  className={`num ml-auto text-[12px] ${
                    person.negative ? 'text-ink-muted' : 'text-ink'
                  }`}
                >
                  {person.amount}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <span className="text-[12px] text-body">Yat Lok · roast goose · 4 ways</span>
            <span className="num text-[12px] text-ink">{moneyParts(1059, 'HKD').value}</span>
          </div>

          <Link
            href="/login"
            className="mt-4 flex h-10 items-center justify-center rounded-[5px] bg-cobalt text-[12px] font-semibold text-paper transition-colors hover:bg-cobalt-deep"
          >
            Open the ledger →
          </Link>
          <p className="mt-3 text-center font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-muted">
            One tab. Four friends. No chasing.
          </p>
        </div>
      </section>

      <section className="border-y-2 border-ink">
        <div className="mx-auto grid w-full max-w-[1320px] sm:grid-cols-3">
          {statement.map(([number, label], index) => (
            <div
              key={number}
              className={`flex items-baseline gap-2 px-5 py-5 sm:px-10 ${
                index > 0 ? 'border-t border-line sm:border-t-0 sm:border-l' : ''
              }`}
            >
              <span className="font-mono text-[8px] tracking-[0.16em] text-ink-muted">{number}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how"
        className="mx-auto grid w-full max-w-[1320px] scroll-mt-8 gap-16 px-5 py-20 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28"
      >
        <div>
          <p className="eyebrow">02 / The record</p>
          <h2 className="mt-4 max-w-[19ch] font-heading text-[clamp(36px,4.4vw,52px)] leading-[0.98] font-extrabold tracking-[-0.045em]">
            Every expense in its column. Every person on the hook.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.65] text-body">
            A feed tells you what happened. A ledger tells you where you stand. Dates, payers,
            totals and shares add up so you can scan the page instead of rereading it.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              'One balance you can act on, not five cards competing for attention.',
              'People and amounts in the same view — no detective work.',
              'Open and settled states that read at a glance.',
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[14px] leading-[1.55] text-body">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 bg-cobalt" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-line-strong bg-paper">
          <div className="flex items-baseline justify-between gap-4 bg-cobalt px-5 py-3.5 text-paper">
            <span className="font-heading text-[14px] font-bold">Sunday Table · Nov 2026</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-paper/70">
              Open tab
            </span>
          </div>
          <div className="hidden grid-cols-[1.6fr_80px_70px_60px] gap-3 border-b border-line px-5 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-muted sm:grid">
            <span>Expense</span>
            <span className="text-right">Total</span>
            <span className="text-right">Share</span>
            <span className="text-right">State</span>
          </div>
          <ul>
            {ledgerRows.map((row) => (
              <li
                key={row.note}
                className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-line px-5 py-3 last:border-0 sm:grid-cols-[1.6fr_80px_70px_60px] sm:items-center"
              >
                <span>
                  <span className="block text-[12.5px] font-medium text-ink">{row.note}</span>
                  <span className="mt-0.5 block text-[10px] text-ink-muted">{row.meta}</span>
                </span>
                <span className="num hidden text-right text-[11.5px] sm:block">
                  {moneyParts(row.total, 'HKD').value}
                </span>
                <span className="num text-right text-[11.5px]">{row.share}</span>
                <span
                  className={`col-start-2 justify-self-end font-mono text-[8px] uppercase tracking-[0.12em] sm:col-start-auto ${
                    row.state === 'Settled' ? 'text-ink-muted' : 'text-cobalt'
                  }`}
                >
                  {row.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1320px] px-5 pb-20 sm:px-10 lg:pb-28">
        <p className="eyebrow">03 / How it works</p>
        <h2 className="mt-4 max-w-[20ch] font-heading text-[clamp(36px,4.4vw,52px)] leading-[0.98] font-extrabold tracking-[-0.045em]">
          From bill to square in three moves.
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="border-t border-ink pt-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-cobalt">
                {step.number}
              </span>
              <h3 className="mt-2 font-heading text-[18px] font-bold tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="settle" className="scroll-mt-8 bg-cobalt text-paper">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-6 px-5 py-20 sm:px-10 lg:py-24">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-paper/70">
            The only reminder you need
          </p>
          <h2 className="max-w-[22ch] font-heading text-[clamp(38px,5vw,64px)] leading-[0.95] font-extrabold tracking-[-0.05em]">
            One honest number.
            <br />
            Then everybody&rsquo;s square.
          </h2>
          <p className="max-w-[54ch] text-[15px] leading-[1.65] text-paper/80">
            Open a tab for the table, the flat or the trip. Add the first expense in under a
            minute; the ledger does the rest.
          </p>
          <Button
            size="lg"
            variant="light"
            nativeButton={false}
            render={<Link href="/register" />}
            className="mt-2"
          >
            Open a tab
          </Button>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-paper/60">
            Free for the table · 12 currencies
          </span>
        </div>
      </section>
    </>
  );
}
