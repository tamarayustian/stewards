import { cookies, headers } from 'next/headers';

import { AUTH_USER_HEADER, decodeSessionUser, type SessionUser } from '@/lib/auth-header';
import { createServerClientReadOnly } from '@/lib/supabase';

// Read the identity verified by proxy.ts. Falls back to a direct Supabase check
// when the header is absent (e.g. a route outside the proxy matcher).
export async function getCurrentUser(): Promise<SessionUser | null> {
  const headerStore = await headers();
  const fromProxy = decodeSessionUser(headerStore.get(AUTH_USER_HEADER));
  if (fromProxy) return fromProxy;

  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : undefined,
    },
  };
}
