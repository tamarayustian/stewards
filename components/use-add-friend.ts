'use client';

import { useState, useTransition } from 'react';
import { addFriend } from '@/app/(app)/actions';
import { buildAddFriendFormData, type FriendInput } from '@/lib/friends';

type AddedContact = NonNullable<Awaited<ReturnType<typeof addFriend>>['contact']>;

export function useAddFriend(onAdded?: (contact: AddedContact) => void) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const input: FriendInput = { name, email, phone };
    startTransition(async () => {
      const result = await addFriend(buildAddFriendFormData(input));
      if (result?.contact) {
        setName('');
        setEmail('');
        setPhone('');
        setError(null);
        onAdded?.(result.contact);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  return { name, setName, email, setEmail, phone, setPhone, error, setError, pending, submit };
}
