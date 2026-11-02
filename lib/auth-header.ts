// Identity handoff between proxy.ts and the app render.
//
// The proxy already calls Supabase to validate/refresh the session on every
// request, so it forwards the verified user as a request header. Pages and
// server actions decode it instead of paying another Supabase auth round trip.
//
// Keep this module free of server-only imports: proxy.ts also uses it.

export const AUTH_USER_HEADER = 'x-stewards-user';

export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata: { name?: string };
};

// encodeURIComponent keeps the header ASCII-safe for non-ASCII names.
export function encodeSessionUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const name = user.user_metadata?.name;
  return encodeURIComponent(
    JSON.stringify({
      id: user.id,
      email: user.email ?? null,
      name: typeof name === 'string' ? name : null,
    }),
  );
}

export function decodeSessionUser(raw: string | null): SessionUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      id?: unknown;
      email?: unknown;
      name?: unknown;
    };

    if (typeof parsed.id !== 'string' || parsed.id.length === 0) return null;

    return {
      id: parsed.id,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      user_metadata: typeof parsed.name === 'string' ? { name: parsed.name } : {},
    };
  } catch {
    return null;
  }
}
