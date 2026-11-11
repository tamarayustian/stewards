'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

const sectionLinks = [
  { href: '/#ledger-section', label: 'The ledger' },
  { href: '/#how', label: 'How it works' },
  { href: '/#settle', label: 'Settle' },
];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const actions = signedIn ? (
    <>
      {isHome && (
        <Link
          href="/login"
          className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-cobalt hover:underline sm:inline"
        >
          See a live tab
        </Link>
      )}
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Open app
      </Button>
    </>
  ) : isHome ? (
    <>
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href="/login" />}
        className="hidden sm:inline-flex"
      >
        Sign in
      </Button>
      <Button nativeButton={false} render={<Link href="/register" />}>
        Start a tab
      </Button>
    </>
  ) : (
    <Button
      nativeButton={false}
      render={<Link href={pathname === '/register' ? '/login' : '/register'} />}
    >
      {pathname === '/register' ? 'Sign in' : 'Start a tab'}
    </Button>
  );

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-5 py-5 sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-[5px] bg-cobalt font-heading text-[15px] font-extrabold text-paper">
            §
          </span>
          <span className="font-heading text-[17px] font-extrabold tracking-[-0.03em] text-ink">
            Stewards
          </span>
        </Link>

        {isHome && (
          <nav className="hidden items-center gap-6 md:flex" aria-label="Landing sections">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      </div>
    </header>
  );
}
