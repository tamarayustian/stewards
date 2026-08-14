'use client';

import {
  BookUser,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Sprout,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signout } from '@/app/auth/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Activity', icon: ReceiptText },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/people', label: 'People', icon: BookUser },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
}

export function AppShell({ children, userName, userInitials }: AppShellProps) {
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
                className={`w-full justify-start gap-3 ${active ? 'bg-primary/10 text-primary hover:bg-primary/15' : ''}`}
                render={<Link href={item.href} />}
              >
                <Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-4">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{userName}</span>
            <form action={signout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="relative after:absolute after:-inset-1.5 after:content-['']"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Sprout className="size-3.5 text-primary" />
            </div>
            <span className="font-heading text-base font-semibold text-walnut">Stewards</span>
          </div>
          <div className="flex items-center gap-1">
            <form action={signout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="relative after:absolute after:-inset-1.5 after:content-['']"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
            <Avatar size="sm">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="flex items-center justify-around border-t border-border bg-background py-1 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`size-5 ${active ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
