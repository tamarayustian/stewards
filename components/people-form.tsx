'use client';

import { FormError } from '@/components/form-message';
import { useAddFriend } from '@/components/use-add-friend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PeopleForm() {
  const friend = useAddFriend();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    friend.submit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-heading text-[17px] font-bold tracking-[-0.03em]">Add a person</h2>
      <p className="mt-1 text-[11px] text-ink-muted">
        Name is enough. Email or phone finds them later.
      </p>
      <div className="mt-4 space-y-2">
        <Input
          value={friend.name}
          onChange={(e) => friend.setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
        />
        <Input
          value={friend.email}
          onChange={(e) => friend.setEmail(e.target.value)}
          type="email"
          placeholder="Email (optional)"
          aria-label="Email"
        />
        <Input
          value={friend.phone}
          onChange={(e) => friend.setPhone(e.target.value)}
          type="tel"
          placeholder="Phone (optional)"
          aria-label="Phone"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={friend.pending || friend.name.trim().length === 0}
        >
          {friend.pending ? 'Adding…' : 'Add person'}
        </Button>
      </div>
      <FormError message={friend.error ?? undefined} />
    </form>
  );
}
