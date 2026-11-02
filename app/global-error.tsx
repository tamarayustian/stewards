'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fraunces, ibmPlexMono, karla } from '@/lib/fonts';
import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html
      lang="en"
      className={`${karla.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-dvh antialiased`}
    >
      <body className="flex h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold text-balance text-walnut sm:text-4xl">
            Something broke on our end.
          </h1>
          <p className="mx-auto max-w-[46ch] text-sm text-muted-foreground sm:text-base">
            The app failed to load. Reload the page, and if it keeps happening, email{' '}
            <a
              href="mailto:support@stewards.app"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@stewards.app
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
