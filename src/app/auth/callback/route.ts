// ============================================================================
//  MasterAnalytics Pro — Auth Callback Route Handler
//  Handles the PKCE email-confirmation redirect from Supabase.
//  URL flow: user clicks email link → Supabase redirects to /auth/callback?code=...
//  → this route exchanges the code for a session → redirects to /dashboard.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CookieSetItem = { name: string; value: string; options: CookieOptions };

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  // Validate `next` is a relative path (prevent open-redirect)
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Build the redirect response FIRST — Supabase will write session cookies to it.
  const response = NextResponse.redirect(new URL(safeNext, origin));

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieSetItem[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Exchange the PKCE code for a session. This populates the response cookies.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "auth_callback");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
