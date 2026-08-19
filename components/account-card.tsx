'use client';

import { Mail, Shield } from 'lucide-react';
import { useActionState } from 'react';

import { updateEmail, updatePassword } from '@/app/(app)/actions';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountCard({ email }: { email: string | null }) {
  const [emailState, emailAction, emailPending] = useActionState(updateEmail, undefined);
  const [pwState, pwAction, pwPending] = useActionState(updatePassword, undefined);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-primary" />
            Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={emailAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" defaultValue={email ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPasswordEmail">Current password</Label>
              <PasswordInput
                id="currentPasswordEmail"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">
                Required to confirm this change.
              </p>
            </div>

            {emailState?.error && <p className="text-xs text-destructive">{emailState.error}</p>}
            {emailState?.success && (
              <p className="text-xs text-accent">
                Confirmation link sent. Check your inbox.
              </p>
            )}

            <Button type="submit" size="sm" disabled={emailPending}>
              {emailPending ? 'Saving...' : 'Update email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-primary" />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={pwAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPasswordPw">Current password</Label>
              <PasswordInput
                id="currentPasswordPw"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput id="newPassword" name="newPassword" required minLength={6} />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>

            {pwState?.error && <p className="text-xs text-destructive">{pwState.error}</p>}
            {pwState?.success && <p className="text-xs text-accent">Password updated.</p>}

            <Button type="submit" size="sm" disabled={pwPending}>
              {pwPending ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
