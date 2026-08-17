'use server';

import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { resolveInvitesForEmail } from '@/lib/invites';
import { ensureUserRow } from '@/lib/users';
import { validatePhone } from '@/lib/auth-validation';

export async function signup(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const countryCode = formData.get('countryCode') as string;
  const phoneRaw = formData.get('phone') as string;
  const currency = (formData.get('currency') as string) || 'HKD';

  const phoneResult = validatePhone(countryCode, phoneRaw);
  if ('error' in phoneResult) {
    return { error: phoneResult.error };
  }
  const phone = phoneResult.fullPhone;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone, currency } },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user?.identities?.length === 0) {
    return { error: 'An account with this email already exists.', exists: true };
  }

  if (data.user && data.session) {
    await ensureUserRow(data.user);
    await resolveInvitesForEmail(data.user.email ?? '');
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  // No session means email confirmation is required
  return { success: email };
}

export async function login(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await ensureUserRow(data.user);
    await resolveInvitesForEmail(data.user.email ?? '');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signout() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
