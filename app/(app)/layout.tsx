import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth';
import { initials } from '@/lib/avatars';
import { countUnreadReminders } from '@/lib/balances';
import db from '@/lib/db';

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
    select: { name: true, currency: true },
  });

  const displayName = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'User';

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('stewards:rail')==='collapsed')document.documentElement.dataset.rail='collapsed'}catch(e){}`,
        }}
      />
      <AppShell
        userName={displayName}
        userInitials={initials(displayName)}
        userCurrency={profile?.currency ?? 'HKD'}
        unreadReminders={unreadReminders}
      >
        {children}
      </AppShell>
    </>
  );
}
