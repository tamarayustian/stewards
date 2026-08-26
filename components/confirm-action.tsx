'use client';

import { useActionState, useState } from 'react';

import {
  AlertDialogPopup,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';

export function ConfirmAction({
  action,
  fields,
  title,
  description,
  confirmLabel,
  pendingLabel = 'Processing…',
  cancelLabel = 'Cancel',
  trigger,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  fields: { name: string; value: string }[];
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  trigger: React.ReactElement;
}) {
  const [state, actionFn, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);

  return (
    <>
      <AlertDialogRoot open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={trigger} />
        <AlertDialogPopup>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <form action={actionFn}>
              {fields.map((f) => (
                <input key={f.name} type="hidden" name={f.name} value={f.value} />
              ))}
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {pending ? pendingLabel : confirmLabel}
              </Button>
            </form>
          </div>
        </AlertDialogPopup>
      </AlertDialogRoot>
      <FormError message={state?.error} />
    </>
  );
}
