'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Go home
            </Button>
            <Button onClick={() => reset()}>Try again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
