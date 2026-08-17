'use client';

import { MailCheck, Sprout } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, Suspense, useActionState, useState } from 'react';

import { signup } from '@/app/auth/actions';
import { validateEmail, validatePassword, validatePhone } from '@/lib/auth-validation';
import { CURRENCIES } from '@/lib/currencies';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function RegisterForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(signup, undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prefilledName = searchParams?.get('name') ?? '';
  const prefilledEmail = searchParams?.get('email') ?? '';

  function validate(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const countryCode = formData.get('countryCode') as string;
    const phone = formData.get('phone') as string;
    const newErrors: Record<string, string> = {};

    if (!name || name.trim().length === 0) {
      newErrors.name = 'Name is required.';
    }

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    const phoneResult = validatePhone(countryCode, phone);
    if ('error' in phoneResult) {
      newErrors.phone = phoneResult.error;
    }

    const currency = formData.get('currency') as string;
    if (!currency || !(currency in CURRENCIES)) {
      newErrors.currency = 'Please select a currency.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (validate(formData)) {
      startTransition(() => {
        action(formData);
      });
    }
  }

  if (state?.success) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-6 text-primary" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to{' '}
              <span className="text-foreground">{state.success}</span>. Click it to activate your
              account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder or try signing up again.
            </p>
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Sprout className="size-5 text-primary" />
          </div>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={prefilledName} required />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={prefilledEmail} required />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex gap-2">
                <select
                  id="countryCode"
                  name="countryCode"
                  defaultValue="+852"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="+852">HK +852</option>
                  <option value="+1">US +1</option>
                  <option value="+86">CN +86</option>
                  <option value="+886">TW +886</option>
                  <option value="+44">UK +44</option>
                  <option value="+81">JP +81</option>
                  <option value="+82">KR +82</option>
                  <option value="+65">SG +65</option>
                  <option value="+61">AU +61</option>
                  <option value="+1">CA +1</option>
                  <option value="+49">DE +49</option>
                  <option value="+33">FR +33</option>
                  <option value="+62">ID +62</option>
                  <option value="+63">PH +63</option>
                </select>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9123 4567"
                  required
                  className="flex-1"
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                defaultValue="HKD"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} — {info.name}
                  </option>
                ))}
              </select>
              {errors.currency && <p className="text-xs text-destructive">{errors.currency}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" required minLength={6} />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={6} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {state?.error &&
              (state?.exists ? (
                <p className="text-sm text-destructive">
                  An account with this email already exists.{' '}
                  <Link
                    href="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-destructive">{state.error}</p>
              ))}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
