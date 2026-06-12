import { signout } from '@/app/auth/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import db from '@/lib/db';
import { createServerClientReadOnly } from '@/lib/supabase';
import { LogOut, Plus, Sprout, Users, Wallet } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

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

  const displayName = profile?.name ?? 'User';

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Sprout className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Stewards</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <form action={signout}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{profile?.email}</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">You owe</p>
                <p className="text-lg font-semibold text-destructive">$0.00</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">You are owed</p>
                <p className="text-lg font-semibold text-primary">$0.00</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No groups yet</p>
              <p className="text-sm text-muted-foreground">
                Create or join a group to start splitting expenses.
              </p>
            </div>
            <Button>
              <Plus className="size-4" />
              Create your first group
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
