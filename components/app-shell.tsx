'use client';

import { LayoutDashboard, LogOut, ReceiptText, Settings, Sprout, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signout } from '@/app/auth/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/activity', label: 'Expenses', icon: ReceiptText },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
  unreadReminders: number;
}

export function AppShell({ children, userName, userInitials, unreadReminders }: AppShellProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-secondary md:flex">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Sprout className="size-4 text-primary" />
          </div>
          <span className="font-heading text-base font-semibold text-walnut">Stewards</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Button
                key={item.href}
                variant="ghost"
                nativeButton={false}
                className={`relative w-full justify-start gap-3 ${active ? 'bg-primary/10 text-primary hover:bg-primary/15' : ''}`}
                render={<Link href={item.href} aria-current={active ? 'page' : undefined} />}
              >
                <Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                {item.label}
                {item.href === '/expenses' && unreadReminders > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
                    {unreadReminders}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-4">
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted"
                />
              }
            >
              <Avatar size="sm">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{userName}</span>
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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Sprout className="size-3.5 text-primary" />
            </div>
            <span className="font-heading text-base font-semibold text-walnut">Stewards</span>
          </div>
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
              <Avatar size="sm">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
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
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background py-1 pb-[env(safe-area-inset-bottom)] md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-5" />
                {item.label}
                {item.href === '/expenses' && unreadReminders > 0 && (
                  <span className="absolute right-1 top-0 size-4 rounded-full bg-destructive text-center text-[9px] font-semibold leading-4 text-white">
                    {unreadReminders > 9 ? '9+' : unreadReminders}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
