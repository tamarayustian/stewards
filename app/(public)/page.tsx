import { ArrowRight, Handshake, Scale, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-5 text-primary" />
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
            <Scale className="size-5 text-accent" />
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Handshake className="size-5 text-primary" />
          </div>
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Split expenses with friends. <span className="text-primary">No spreadsheets needed.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">
          Track shared costs, split bills evenly or custom, and settle up — all in one warm, simple
          place.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Create your first group
          </Button>
          <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-4 px-6 pb-20">
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Track Together</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground text-pretty">
                Create groups, add friends, and log shared expenses in seconds. Everyone sees the
                same numbers, so there&rsquo;s never any confusion.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Scale className="size-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Split Fairly</h3>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Equal or custom splits — everyone pays their share, no math required.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl p-6 ring-1 ring-foreground/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Handshake className="size-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Settle Simply</h3>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                See who owes whom and settle up with a tap. No IOUs, no spreadsheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-balance">Ready to simplify shared expenses?</h2>
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
