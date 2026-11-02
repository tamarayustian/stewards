import { Compass } from 'lucide-react';
import Link from 'next/link';

import { ErrorShell } from '@/components/error-shell';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <ErrorShell>
      <ErrorState
        icon={Compass}
        tone="primary"
        ghost="404"
        title="This page wandered off."
        message="Nothing lives at this address. The link may be old, or it led somewhere that moved."
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button nativeButton={false} render={<Link href="/" />}>
          Back home
        </Button>
      </ErrorState>
    </ErrorShell>
  );
}
