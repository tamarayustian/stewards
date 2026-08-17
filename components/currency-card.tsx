'use client';

import { useActionState } from 'react';

import { updateCurrency } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CURRENCIES, type Currency } from '@/lib/currencies';

export function CurrencyCard({ currentCurrency }: { currentCurrency: Currency }) {
  const [state, action, pending] = useActionState(updateCurrency, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Currency</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center gap-3">
          <select
            name="currency"
            defaultValue={currentCurrency}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {info.symbol} — {info.name}
              </option>
            ))}
          </select>
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
