'use client';

import { User } from 'lucide-react';
import { useActionState } from 'react';

import { updateProfile } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountrySelect } from '@/components/country-select';
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/lib/countries';

export function ProfileCard({ name, phone }: { name: string; phone: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  // Parse existing phone into country code + number for display
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-primary" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
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

          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          {state?.success && <p className="text-xs text-accent">Profile updated.</p>}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
