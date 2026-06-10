import { createBrowserClient } from '@supabase/ssr';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

// Browser client for use in Client Components (handles cookies via document.cookie)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server client for use in Server Components / Server Actions / Route Handlers.
// Requires a cookieStore from next/headers so auth tokens can be refreshed.
export function createServerClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
