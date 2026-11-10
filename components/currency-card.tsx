'use client';

import { useEffect, useActionState } from 'react';

import { updateCurrency } from '@/app/(app)/actions';
import { CurrencySelect } from '@/components/currency-select';
import { FormError } from '@/components/form-message';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import type { Currency } from '@/lib/currencies';

export function CurrencyCard({ currentCurrency }: { currentCurrency: Currency }) {
  const [state, action, pending] = useActionState(updateCurrency, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: 'Currency updated', variant: 'success' });
  }, [state?.success, toast]);

  return (
    <form action={action} className="space-y-4">
      <div className="max-w-sm">
        <CurrencySelect name="currency" defaultValue={currentCurrency} />
      </div>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save currency'}
      </Button>
    </form>
  );
}
