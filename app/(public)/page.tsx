import Link from 'next/link';
import { MessageCircle, Bell, Receipt, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

const balanceRows = [
  { name: 'Alex', amount: 194.77, status: 'owe' as const },
  { name: 'Sam', amount: 0, status: 'settled' as const },
  { name: 'Pip', amount: 0, status: 'settled' as const },
];

const fmt = (n: number) =>
  `HK$${n.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Home() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-16">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.03em] text-balance text-foreground">
              Split expenses
              <br />
              with friends
              <br />
              <span className="text-walnut">without the awkward.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Log what you paid. Send a quick reminder when it&apos;s time to settle up. No
              spreadsheets, no group-chat guilt trips.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                Get started
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Sign in
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm lg:ml-auto">
            <BalanceCardMockup />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-rule px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-12">
          <Feature
            icon={<Receipt className="size-5" />}
            title="Add what you paid"
            body="Log a dinner, a trip, a shared taxi. Stewards remembers the details so you don't have to."
          />
          <Feature
            icon={<Receipt className="size-5" />}
            title="Friends see their share"
            body="Everyone knows what they owe — no 'wait, how much was my part?' texts."
          />
          <Feature
            icon={<Bell className="size-5" />}
            title="Ping to settle"
            body="One tap sends a friendly reminder. Via WhatsApp or in-app — whatever's easiest."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-rule px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
          <Differentiator
            icon={<Bell className="size-5" />}
            title="Built-in reminders"
            body="No more 'hey just checking in...' texts. Send a reminder with one tap."
          />
          <Differentiator
            icon={<MessageCircle className="size-5" />}
            title="WhatsApp ready"
            body="Send a pre-written reminder straight to WhatsApp. Your friends don't even need the app."
          />
          <Differentiator
            icon={<ArrowRight className="size-5" />}
            title="No account needed to settle"
            body="Friends can pay you back without signing up first. Zero friction."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-rule px-6 py-16 text-center">
        <h2 className="font-heading text-3xl font-normal italic text-walnut sm:text-4xl">
          No more chasing payments.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Split expenses. Send reminders. Get paid back.
        </p>
        <div className="mt-8 flex items-center justify-center gap-6">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Start splitting
            <ArrowRight className="size-4" />
          </Button>
          <Link
            href="/login"
            className="font-mono text-sm uppercase tracking-widest text-walnut hover:text-foreground"
          >
            sign in
          </Link>
        </div>
      </section>
    </>
  );
}

function BalanceCardMockup() {
  const alexRow = balanceRows.find((r) => r.name === 'Alex')!;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-base font-normal text-foreground">The table — sundays</p>
        <p className="font-mono text-xs text-muted-foreground">4 people</p>
      </div>

      <div className="mt-4 space-y-0">
        {balanceRows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between border-b border-rule py-3 last:border-b-0"
          >
            <span className="font-heading text-base font-normal text-foreground">{row.name}</span>
            <div className="flex items-center gap-3">
              {row.status === 'owe' ? (
                <span className="font-mono text-sm font-medium text-destructive">
                  owes {fmt(row.amount)}
                </span>
              ) : (
                <span className="font-mono text-sm text-muted-foreground line-through">
                  settled
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-secondary p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-sm font-normal text-foreground">
              Alex owes you {fmt(alexRow.amount)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sundays dinner</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <MessageCircle className="size-3.5" />
            Ping
          </Button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-walnut">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-lg font-normal text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Differentiator({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-walnut">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-base font-normal text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
