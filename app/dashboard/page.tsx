import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import db from '@/lib/db';
import { signout } from '@/app/auth/actions';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <form action={signout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1 p-6">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-medium">
            Welcome, {profile?.name ?? 'User'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{profile?.email}</p>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Your groups will appear here once you create or join one.
          </p>
        </div>
      </main>
    </div>
  );
}
