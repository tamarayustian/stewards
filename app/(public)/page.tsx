import Link from 'next/link';

import { Button } from '@/components/ui/button';

type Row = {
  who: string;
  paid?: number;
  share?: number;
  amount: number;
  detail: string;
  status: 'settled' | 'owe' | 'owed';
};

const rows: Row[] = [
  {
    who: 'You',
    paid: 584.32,
    amount: 584.32,
    detail: 'paid for sundays',
    status: 'owed',
  },
  {
    who: 'Alex',
    share: 194.77,
    amount: 194.77,
    detail: 'share of sundays',
    status: 'owe',
  },
  {
    who: 'Sam',
    share: 194.77,
    amount: 194.77,
    detail: 'share of sundays',
    status: 'settled',
  },
  {
    who: 'Pip',
    share: 194.78,
    amount: 194.78,
    detail: 'share of sundays',
    status: 'settled',
  },
];

const fmt = (n: number) =>
  `HK$${n.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Home() {
  const totals = rows.reduce(
    (acc, r) => {
      acc.paid += r.paid ?? 0;
      return acc;
    },
    { paid: 0 },
  );

  const alexOwes = rows.find((r) => r.who === 'Alex' && r.status === 'owe')?.amount ?? 0;

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-16">
        <p className="ledger-eyebrow">a household ledger</p>
        <h1 className="mt-5 font-heading text-[clamp(3rem,9vw,7.5rem)] font-normal leading-[0.95] tracking-[-0.03em] text-balance text-foreground">
          Split the dinner.
          <br />
          <span className="italic text-walnut">Keep the table.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A small ledger for the people you share meals with. Log what was paid, set each
          share, mark it settled when the money moves. Kept by hands, not apps.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <div className="border-t border-rule pt-6">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="ledger-eyebrow">the table &mdash; sundays</p>
            <p className="font-mono text-xs text-walnut">
              {rows.length} people &middot; {fmt(totals.paid)}
            </p>
          </div>
          <table className="ledger w-full border-collapse">
            <caption className="sr-only">the table — sundays</caption>
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="ledger-eyebrow w-1/3 pb-2 text-left font-normal">person</th>
                <th className="ledger-eyebrow pb-2 text-left font-normal">what</th>
                <th className="ledger-eyebrow pb-2 text-right font-normal">amount</th>
                <th className="ledger-eyebrow pb-2 text-right font-normal">status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.who} className="ledger-row">
                  <td
                    data-col="name"
                    className="font-heading text-xl font-normal text-foreground"
                  >
                    {row.who}
                  </td>
                  <td data-col="detail" className="text-sm text-muted-foreground">
                    {row.detail}
                    {row.paid !== undefined && (
                      <span className="ml-2 font-mono text-xs text-walnut">
                        paid {fmt(row.paid)}
                      </span>
                    )}
                  </td>
                  <td
                    data-col="amount"
                    className={
                      'text-right font-mono text-base ' +
                      (row.status === 'owe'
                        ? 'text-destructive'
                        : row.status === 'owed'
                          ? 'text-foreground'
                          : 'text-muted-foreground line-through decoration-1')
                    }
                  >
                    {fmt(row.amount)}
                  </td>
                  <td data-col="status" className="text-right">
                    <StatusMark status={row.status} />
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-heading text-base italic text-walnut">
                      Alex owes you {fmt(alexOwes)}.
                    </p>
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href="/register" />}
                    >
                      <span className="font-mono">+</span>&nbsp;Open the ledger
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-rule px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-12">
          <Block
            n="i."
            title="Log a row"
            body="Add the cost, who paid, and the share for each person at the table."
          />
          <Block
            n="ii."
            title="Shares set themselves"
            body="Even or custom — each share lands on the right row, no spreadsheet needed."
          />
          <Block
            n="iii."
            title="Mark it settled"
            body="When the money moves, mark it. The ledger stays even and nothing is forgotten."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-rule px-6 py-16 text-center">
        <p className="ledger-eyebrow">the table is set</p>
        <h2 className="mt-4 font-heading text-3xl font-normal italic text-walnut sm:text-4xl">
          Invite your people.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Free, faithful, and quieter than the group chat.
        </p>
        <div className="mt-8 flex items-center justify-center gap-6">
          <Link
            href="/register"
            className="font-heading text-lg text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Open the ledger &rarr;
          </Link>
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-widest text-walnut hover:text-foreground"
          >
            sign in
          </Link>
        </div>
      </section>
    </>
  );
}

function StatusMark({ status }: { status: Row['status'] }) {
  if (status === 'settled') {
    return <span className="ledger-mark">✓ settled</span>;
  }
  if (status === 'owe') {
    return <span className="font-mono text-xs uppercase tracking-widest text-destructive">owes</span>;
  }
  return <span className="font-mono text-xs uppercase tracking-widest text-walnut">paid</span>;
}

function Block({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="ledger-mark text-2xl">{n}</p>
      <h3 className="mt-3 font-heading text-xl font-normal text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}