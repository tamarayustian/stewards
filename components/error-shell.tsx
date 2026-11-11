import Link from 'next/link';

import { SiteFooter } from '@/components/site-footer';

export function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[5px] bg-cobalt font-heading text-sm font-bold text-paper">
            §
          </span>
          <span className="font-heading text-[17px] font-semibold tracking-[-0.02em] text-ink">
            Stewards
          </span>
        </Link>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
