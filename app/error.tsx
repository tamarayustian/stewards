'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { ErrorShell } from '@/components/error-shell';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorShell>
      <ErrorState
        icon={AlertTriangle}
        title="Something broke on our end."
        message="Nothing you did. Your data is safe. Try again, or head back home."
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Back home
        </Button>
        <Button onClick={() => reset()}>Try again</Button>
      </ErrorState>
      <p className="relative mt-8 text-xs text-muted-foreground">
        Still stuck? Email{' '}
        <a href="mailto:support@stewards.app" className="underline underline-offset-4 hover:text-foreground">
          support@stewards.app
        </a>
      </p>
    </ErrorShell>
  );
}
