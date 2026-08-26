'use client';

import { UserPlus } from 'lucide-react';

import { FormError } from '@/components/form-message';
import { useAddFriend } from '@/components/use-add-friend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PeopleForm() {
  const friend = useAddFriend();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    friend.submit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label>Add a person</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={friend.name}
          onChange={(e) => friend.setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          className="sm:flex-1"
        />
        <Input
          value={friend.email}
          onChange={(e) => friend.setEmail(e.target.value)}
          type="email"
          placeholder="Email (optional — finds their account)"
          aria-label="Email"
          className="sm:flex-1"
        />
        <Input
          value={friend.phone}
          onChange={(e) => friend.setPhone(e.target.value)}
          type="tel"
          placeholder="Phone (optional)"
          aria-label="Phone"
          className="sm:flex-1"
        />
        <Button type="submit" disabled={friend.pending || friend.name.trim().length === 0}>
          <UserPlus className="size-3.5" />
          {friend.pending ? 'Adding...' : 'Add'}
        </Button>
      </div>
      <FormError message={friend.error ?? undefined} />
    </form>
  );
}
