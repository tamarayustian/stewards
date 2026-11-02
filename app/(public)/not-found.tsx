import { Compass } from 'lucide-react';
import Link from 'next/link';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <ErrorState
      icon={Compass}
      tone="primary"
      title="This page wandered off."
      message="Nothing lives at this address. The link may be old, or it led somewhere that moved."
    >
      <Button nativeButton={false} render={<Link href="/" />}>
        Back home
      </Button>
    </ErrorState>
  );
}
