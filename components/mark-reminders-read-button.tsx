'use client';

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
        className="h-auto px-0 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-cobalt underline-offset-4 hover:bg-transparent hover:text-cobalt-deep hover:underline"
        disabled={pending}
      >
        {pending ? 'Marking…' : 'Mark read'}
      </Button>
    </form>
  );
}
