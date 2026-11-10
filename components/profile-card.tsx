'use client';

import { useEffect, useActionState } from 'react';

import { updateProfile } from '@/app/(app)/actions';
import { CountrySelect } from '@/components/country-select';
import { FormError } from '@/components/form-message';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/lib/countries';

export function ProfileCard({ name, phone }: { name: string; phone: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: 'Profile updated', variant: 'success' });
  }, [state?.success, toast]);

  let defaultCountry: string = DEFAULT_COUNTRY_CODE;
  let phoneDigits = '';
  if (phone) {
    const matched = COUNTRIES.find((c) => phone.startsWith(c.code));
    if (matched) {
      defaultCountry = matched.code;
      phoneDigits = phone.slice(matched.code.length);
    } else {
      phoneDigits = phone;
    }
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <div className="flex gap-2">
            <CountrySelect
              id="countryCode"
              name="countryCode"
              defaultValue={defaultCountry}
              aria-label="Country code"
            />
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              defaultValue={phoneDigits}
              placeholder="9123 4567"
              required
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
