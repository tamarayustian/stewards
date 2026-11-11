'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, use, useEffect, useRef } from 'react';
import { signout } from '@/app/auth/actions';
import { PersonAvatar } from '@/components/person-avatar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/people', label: 'People' },
  { href: '/settings', label: 'Settings' },
];

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
  userCurrency: string;
  // Resolved (streamed) inside Suspense so the nav renders immediately.
  unreadReminders: Promise<number>;
}

function UnreadBadge({ count, variant }: { count: Promise<number>; variant: 'rail' | 'tab' }) {
  const unreadReminders = use(count);

  if (unreadReminders <= 0) return null;

  if (variant === 'tab') {
    return (
      <span className="absolute right-2 top-1 size-4 rounded-full bg-cobalt text-center text-[9px] font-semibold leading-4 text-paper">
        {unreadReminders > 9 ? '9+' : unreadReminders}
      </span>
    );
  }

  return (
    <span className="ml-auto rounded-full bg-paper px-1.5 text-[9px] font-semibold leading-4 text-cobalt">
      {unreadReminders}
    </span>
  );
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[25px] shrink-0 items-center justify-center rounded-[5px] bg-paper font-heading text-[15px] font-extrabold text-cobalt',
        collapsed && 'mx-auto',
      )}
    >
      §
    </span>
  );
}

export function AppShell({
  children,
  userName,
  userInitials,
  userCurrency,
  unreadReminders,
}: AppShellProps) {
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  useEffect(() => {
    const collapsed = document.documentElement.dataset.rail === 'collapsed';
    toggleRef.current?.setAttribute('aria-expanded', String(!collapsed));
  }, []);

  function toggleRail() {
    const root = document.documentElement;
    const collapsed = root.dataset.rail === 'collapsed';
    if (collapsed) delete root.dataset.rail;
    else root.dataset.rail = 'collapsed';
    localStorage.setItem('stewards:rail', collapsed ? 'open' : 'collapsed');
    toggleRef.current?.setAttribute('aria-expanded', String(collapsed));
  }

  return (
    <div className="flex flex-1">
      {/* Desktop rail */}
      <aside className="app-rail hidden flex-col bg-cobalt px-5 py-6 text-paper min-[901px]:flex">
        <Link
          href="/dashboard"
          className="rail-brand flex items-center gap-2.5"
          aria-label="Stewards"
        >
          <BrandMark />
          <span className="font-heading text-[15px] font-extrabold tracking-[0.04em]">
            STEWARDS
          </span>
        </Link>

        <nav className="mt-10 flex flex-col">
          {navItems.map((item, index) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  'relative flex items-center gap-3 border-t border-white/20 py-3.5 text-[12.5px] transition-colors hover:text-paper',
                  active ? 'font-semibold text-paper' : 'text-paper/70',
                )}
              >
                {active && (
                  <span className="rail-active-bar absolute top-0 h-full w-[3px] bg-paper" />
                )}
                <span className="num shrink-0 text-[8px] text-paper/60">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="rail-label flex flex-1 items-center gap-2 truncate">
                  {item.label}
                </span>
                {item.href === '/expenses' && (
                  <Suspense fallback={null}>
                    <UnreadBadge count={unreadReminders} variant="rail" />
                  </Suspense>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/20 pt-4">
          <button
            ref={toggleRef}
            type="button"
            onClick={toggleRail}
            aria-label="Collapse navigation"
            aria-expanded="true"
            className="rail-collapse mb-3 flex w-full items-center gap-3 rounded-[4px] py-2 text-paper/60 transition-colors hover:text-paper"
          >
            <svg
              className="rail-collapse-icon size-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M10 3 5 8l5 5" />
            </svg>
            <span className="rail-label text-[10px] font-medium uppercase tracking-[0.14em]">
              Collapse
            </span>
          </button>

          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={`${userName} — account menu`}
                  className="flex w-full items-center gap-3 rounded-[4px] py-1 text-left transition-opacity hover:opacity-90"
                />
              }
            >
              <PersonAvatar name={userName} size="sm" className="!bg-paper !text-cobalt" />
              <span className="rail-user-text min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">{userName}</span>
                <span className="num block text-[8px] uppercase tracking-[0.12em] text-paper/60">
                  {userCurrency} · base
                </span>
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8}>
              <div className="flex flex-col gap-1">
                <p className="truncate px-2 py-1 text-sm font-medium">{userName}</p>
                <form action={signout}>
                  <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile / tablet top strip */}
        <header className="hidden items-center justify-between border-b border-line bg-paper px-4 py-3 min-[761px]:flex min-[901px]:hidden">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Stewards">
            <span className="flex size-7 items-center justify-center rounded-[5px] bg-cobalt font-heading text-sm font-extrabold text-paper">
              §
            </span>
            <span className="font-heading text-sm font-extrabold tracking-[0.04em] text-ink">
              STEWARDS
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-2 py-2 text-[11px] font-medium',
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-cobalt" />}
                </Link>
              );
            })}
          </nav>
          <AccountDrawer userName={userName} userInitials={userInitials} />
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto pb-[calc(58px+env(safe-area-inset-bottom))] min-[761px]:pb-0">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-6 sm:px-10 sm:py-[26px]">
            {children}
          </div>
        </main>

        {/* Mobile bottom bar */}
        <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[58px] grid-cols-4 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] min-[761px]:hidden">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center justify-center text-[11px] font-medium',
                  active ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-cobalt" />}
                {item.label}
                {item.href === '/expenses' && (
                  <Suspense fallback={null}>
                    <UnreadBadge count={unreadReminders} variant="tab" />
                  </Suspense>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function AccountDrawer({ userName, userInitials }: { userName: string; userInitials: string }) {
  return (
    <Drawer>
      <DrawerTrigger
        render={
          <button
            type="button"
            className="flex items-center rounded-full transition-opacity active:opacity-80"
            aria-label="Account menu"
          />
        }
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-ink font-heading text-[11px] font-bold text-paper">
          {userInitials}
        </span>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{userName}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pt-2">
          <form action={signout}>
            <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
