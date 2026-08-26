'use client';

import { BellRing } from 'lucide-react';
import { useActionState } from 'react';

import { sendReminder } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';

export function RemindButton({ toId }: { toId: string }) {
  const [state, action, pending] = useActionState(sendReminder, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="toId" value={toId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-primary"
        disabled={pending}
      >
        <BellRing className="size-3.5" />
        {pending ? 'Reminding…' : 'Remind'}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}
