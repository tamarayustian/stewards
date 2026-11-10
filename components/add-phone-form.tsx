'use client';

import { useActionState, useState } from 'react';

import { updateContactPhone } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AddPhoneForm({ userId }: { userId: string }) {
  const [phone, setPhone] = useState('');
  const [state, action, pending] = useActionState(updateContactPhone, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Input
        name="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        placeholder="+852…"
        aria-label="Phone number"
        className="h-10 w-40"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending || phone.trim().length === 0}
      >
        {pending ? 'Saving…' : 'Add phone'}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}
