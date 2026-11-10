'use client';

import { useActionState } from 'react';

import { createGroup } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GroupForm() {
  const [state, action, pending] = useActionState(createGroup, undefined);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button">
            <span aria-hidden>+</span>
            New group
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            A shared tab for the people you split with most often.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" name="name" placeholder="e.g. Roommates" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (optional)</Label>
            <Input id="group-description" name="description" placeholder="e.g. Flat 4B bills" />
          </div>
          <FormError message={state?.error} />
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
