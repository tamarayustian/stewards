'use client';

import { User } from 'lucide-react';
import { useActionState } from 'react';

import { updateProfile } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfileCard({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  // Parse existing phone into country code + number for display
  const COUNTRIES = [
    { code: '+852', label: 'HK +852' },
    { code: '+1', label: 'US +1' },
    { code: '+86', label: 'CN +86' },
    { code: '+886', label: 'TW +886' },
    { code: '+44', label: 'UK +44' },
    { code: '+81', label: 'JP +81' },
    { code: '+82', label: 'KR +82' },
    { code: '+65', label: 'SG +65' },
    { code: '+61', label: 'AU +61' },
    { code: '+1', label: 'CA +1' },
    { code: '+49', label: 'DE +49' },
    { code: '+33', label: 'FR +33' },
    { code: '+62', label: 'ID +62' },
    { code: '+63', label: 'PH +63' },
  ];

  let defaultCountry = '+852';
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
              <select
                id="countryCode"
                name="countryCode"
                defaultValue={defaultCountry}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={`${c.code}-${c.label}`} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
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
