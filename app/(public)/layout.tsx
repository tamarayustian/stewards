import { Sprout } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold text-walnut">Stewards</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/register" />}>
            Get started
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <span className="font-heading text-walnut">Stewards</span> — split expenses, faithfully.
      </footer>
    </div>
  );
}
