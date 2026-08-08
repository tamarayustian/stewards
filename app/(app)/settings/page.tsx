import { LogOut, Settings, UserPlus } from 'lucide-react';

import { signout } from '@/app/auth/actions';
import { InviteFriend } from '@/components/invite-friend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Settings className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Invite friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InviteFriend />
        </CardContent>
      </Card>

      <form action={signout}>
        <Button type="submit" variant="outline" className="w-full justify-start gap-2 sm:w-auto">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
