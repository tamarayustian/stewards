import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { SplitReceipt } from '@/components/split-receipt';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <>
      <section className="grid grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-sm font-medium text-primary">The shared table</p>
          <h1 className="mt-3 max-w-xl font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Split expenses with friends.
            <span className="text-primary"> No spreadsheets needed.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">
            Track shared costs, split bills evenly or custom, and settle up — all in one warm,
            simple place.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Create your first group
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          </div>
        </div>
        <div className="hidden sm:block">
          <SplitReceipt />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              n: '01',
              title: 'Log the cost',
              body: 'Add a shared expense in seconds — who paid, what for, and how you&apos;re splitting it.',
            },
            {
              n: '02',
              title: 'Shares are set',
              body: 'Each person&apos;s share appears on the receipt automatically, even for custom splits.',
            },
            {
              n: '03',
              title: 'Settle',
              body: 'Mark it paid when the money moves. The table stays even, with no I.O.U.s lost.',
            },
          ].map((step) => (
            <li key={step.n} className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <p className="font-mono text-xs text-walnut">{step.n}</p>
              <h2 className="mt-2 font-heading text-lg font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border px-6 py-16 text-center">
        <h2 className="font-heading text-xl font-semibold">
          The table&apos;s set. Invite your people.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first group and invite your people — it&rsquo;s free.
        </p>
        <div className="mt-6">
          <Button nativeButton={false} render={<Link href="/register" />}>
            Get started
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
