import { Sprout } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NotFoundCard({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Sprout className="size-6 text-primary" />
          </div>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Button nativeButton={false} render={<Link href={href} />}>
            {label}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
