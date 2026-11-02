import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import { countUnreadReminders } from '@/lib/balances';
import db from '@/lib/db';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Start the badge count but don't await it: AppShell streams it in so the
  // page is not blocked on the nav badge.
  const unreadReminders = countUnreadReminders(user.id);
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });

  const displayName = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'User';
  const initials = getInitials(displayName);

  return (
    <AppShell userName={displayName} userInitials={initials} unreadReminders={unreadReminders}>
      {children}
    </AppShell>
  );
}
