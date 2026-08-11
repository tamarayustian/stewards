import { createBrowserClient, createServerClient as createSsrServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

// Browser client for use in Client Components (handles cookies via document.cookie)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server client for Server Actions and Route Handlers.
// Includes setAll so auth tokens can be refreshed via cookie writes.
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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );
}

// Read-only server client for Server Components.
// No setAll — cookies cannot be modified outside Server Actions / Route Handlers.
// Session refresh will silently fail if the token is expired;
// the proxy middleware handles the redirect before this point.
export function createServerClientReadOnly(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );
}
