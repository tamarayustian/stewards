'use client';

import { UserPlus } from 'lucide-react';
import { useState, useTransition } from 'react';

import { addFriend } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PeopleForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const fd = new FormData();
    fd.set('name', name);
    if (email.trim()) fd.set('email', email.trim());

    startTransition(async () => {
      const result = await addFriend(fd);
      if (result?.contact) {
        setName('');
        setEmail('');
        setError(null);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label>Add a person</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          className="sm:flex-1"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email (optional — finds their account)"
          aria-label="Email"
          className="sm:flex-1"
        />
        <Button type="submit" disabled={pending || name.trim().length === 0}>
          <UserPlus className="size-3.5" />
          {pending ? 'Adding...' : 'Add'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
