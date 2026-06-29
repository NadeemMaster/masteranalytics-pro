// ============================================================================
//  MasterAnalytics Pro — Supabase Middleware (session refresh + route guard)
//  Runs on every matching request to:
//   1. Refresh the user's session (extend expiry) by writing updated cookies.
//   2. Protect authenticated routes (redirect to /login if not signed in).
//   3. Redirect already-authenticated users away from /login and /signup.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

type CookieSetItem = { name: string; value: string; options: CookieOptions };

/**
 * Routes that require an authenticated user.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/upload", "/reports", "/settings"];

/**
 * Routes that authenticated users should NOT see (send them to /dashboard).
 */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Refresh the Supabase auth session on every request and guard protected routes.
 * Called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, skip middleware (let the app surface the error).
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieSetItem[]) {
        // Set cookies on the incoming request so downstream handlers see them.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Create a fresh response that carries the updated cookies.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() validates the session. Do not use getSession() —
  // it trusts the client cookie and is not secure.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Case 1: unauthenticated user hitting a protected route → /login
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Case 2: authenticated user hitting /login or /signup → /dashboard
  if (user && AUTH_ROUTES.some((p) => pathname === p)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
