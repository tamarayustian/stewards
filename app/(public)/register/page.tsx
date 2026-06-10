'use client';

import { useActionState } from 'react';
import { Sprout, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { signup } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signup, undefined);

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
            <Button variant="outline" className="w-full" render={<Link href="/login" />}>
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
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

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
