'use client';

import { Plus } from 'lucide-react';
import { useActionState, useState } from 'react';

import { createGroup } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GroupForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createGroup, undefined);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New group
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" name="name" placeholder="e.g. Roommates" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (optional)</Label>
            <Input id="group-description" name="description" placeholder="e.g. Flat 4B bills" />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" />
              {pending ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
