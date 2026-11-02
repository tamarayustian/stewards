import { Sprout } from 'lucide-react';
import Link from 'next/link';

import { SiteFooter } from '@/components/site-footer';

export function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold text-walnut">Stewards</span>
        </Link>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
