'use client';

import { useActionState } from 'react';

import { updateCurrency } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencySelect } from '@/components/currency-select';
import { FormError, FormSuccess } from '@/components/form-message';
import type { Currency } from '@/lib/currencies';

export function CurrencyCard({ currentCurrency }: { currentCurrency: Currency }) {
  const [state, action, pending] = useActionState(updateCurrency, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Currency</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center gap-3">
          <CurrencySelect name="currency" defaultValue={currentCurrency} className="flex-1" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving...' : 'Save'}
          </Button>
        </form>
        <FormSuccess message={state?.success ? 'Currency updated.' : undefined} className="mt-2" />
        <FormError message={state?.error} className="mt-2" />
      </CardContent>
    </Card>
  );
}
