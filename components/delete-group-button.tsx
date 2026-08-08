'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';

import { deleteGroup } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export function DeleteGroupButton({
  groupId,
  disabled,
  blockedReason,
}: {
  groupId: string;
  disabled: boolean;
  blockedReason?: string;
}) {
  const [state, action, pending] = useActionState(deleteGroup, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      {disabled ? (
        <span className="hidden text-xs text-muted-foreground sm:inline" title={blockedReason}>
          {blockedReason}
        </span>
      ) : null}
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={disabled || pending}
        aria-disabled={disabled}
        title={disabled ? blockedReason : undefined}
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>
      {state?.error && !disabled && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
