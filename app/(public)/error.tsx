'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={AlertTriangle}
      title="Something broke on our end."
      message="Nothing you did. Try again, or head back home."
    >
      <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
        Back home
      </Button>
      <Button onClick={() => reset()}>Try again</Button>
    </ErrorState>
  );
}
