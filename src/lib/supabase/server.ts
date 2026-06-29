// ============================================================================
//  MasterAnalytics Pro — Supabase Server Client
//  Used in Server Components, Route Handlers, and Server Actions.
//  Reads/writes cookies via next/headers so RLS sees the authenticated user.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

type CookieSetItem = { name: string; value: string; options: CookieOptions };

/**
 * Create a Supabase client for use on the server.
 * Always `await` the result (cookies() is async in Next.js 15).
 *
 * @example
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('daily_campaign_data').select('*');
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local (see .env.example)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieSetItem[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /**
           * The `setAll` method is called from a Server Component where
           * cookies cannot be set. This is safe to ignore — the middleware
           * will refresh the session on the next request.
           */
        }
      },
    },
  });
}

/**
 * Get the currently authenticated user, or null.
 * Convenience wrapper — use in Server Components / Route Handlers to gate access.
 *
 * @example
 *   const user = await getUser();
 *   if (!user) redirect('/login');
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Require an authenticated user — redirects to /login if not signed in.
 * Use at the top of protected Server Components / pages.
 *
 * @example
 *   const user = await requireUser();
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user!;
}
