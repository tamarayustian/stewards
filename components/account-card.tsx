'use client';

import { useEffect, useActionState } from 'react';

import { updateEmail, updatePassword } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { PasswordInput } from '@/components/password-input';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailCard({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState(updateEmail, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) {
      toast({ title: 'Confirmation link sent. Check your inbox.', variant: 'success' });
    }
  }, [state?.success, toast]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </div>
      <p className="text-[11px] text-ink-muted">Required to confirm this change.</p>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Update email'}
      </Button>
    </form>
  );
}

export function PasswordCard() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: 'Password updated', variant: 'success' });
  }, [state?.success, toast]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </div>
      <p className="text-[11px] text-ink-muted">At least 6 characters.</p>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
