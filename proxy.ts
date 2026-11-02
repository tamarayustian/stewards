// Runs before every request. Protects /dashboard and redirects logged-in users away from auth pages.
// Uses Next.js 16 Proxy convention (replaces middleware.ts).
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_USER_HEADER, encodeSessionUser } from '@/lib/auth-header';

const protectedRoutes = ['/dashboard', '/people', '/settings', '/expenses', '/auth/claim'];
const authRoutes = ['/login', '/register'];

function copyRefreshedCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuth = authRoutes.some((route) => pathname.startsWith(route));

  // Collects cookies refreshed by getUser() (request + response side).
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build the forwarded headers after the refresh so the render sees new cookies.
  // Delete first: a client-supplied identity header must never be trusted.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_USER_HEADER);
  if (user) {
    requestHeaders.set(AUTH_USER_HEADER, encodeSessionUser(user));
  }

  if (isProtected && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return copyRefreshedCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (isAuth && user) {
    return copyRefreshedCookies(supabaseResponse, NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return copyRefreshedCookies(
    supabaseResponse,
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
