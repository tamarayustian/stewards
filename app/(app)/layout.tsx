import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { countUnreadReminders } from '@/lib/balances';
import db from '@/lib/db';
import { createServerClientReadOnly } from '@/lib/supabase';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profile, unreadReminders] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    }),
    countUnreadReminders(user.id),
  ]);

  const displayName = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'User';
  const initials = getInitials(displayName);

  return (
    <AppShell userName={displayName} userInitials={initials} unreadReminders={unreadReminders}>
      {children}
    </AppShell>
  );
}
