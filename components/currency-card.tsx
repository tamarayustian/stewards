'use client';

import { useActionState } from 'react';

import { updateCurrency } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencySelect } from '@/components/currency-select';
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
        {state?.success && <p className="mt-2 text-xs text-accent">Currency updated.</p>}
        {state?.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
