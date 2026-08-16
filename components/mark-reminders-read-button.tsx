'use client';

import { Check } from 'lucide-react';
import { useActionState } from 'react';

import { markRemindersRead } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export function MarkRemindersReadButton({ fromId }: { fromId?: string }) {
  const [, action, pending] = useActionState(markRemindersRead, undefined);

  return (
    <form action={action}>
      {fromId && <input type="hidden" name="fromId" value={fromId} />}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        disabled={pending}
      >
        <Check className="size-3.5" />
        {pending ? 'Marking…' : 'Mark read'}
      </Button>
    </form>
  );
}
