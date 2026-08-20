'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
          </div>
          <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A critical error occurred. Please try again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => reset()}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
