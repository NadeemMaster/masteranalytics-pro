// ============================================================================
//  MasterAnalytics Pro — Supabase Browser Client
//  Used in Client Components ('use client'), hooks, and browser-side logic.
//  Reads cookies automatically via @supabase/ssr.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Create a Supabase client for use in the browser.
 * Singleton pattern avoids re-creating the client on every render.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local (see .env.example)."
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return browserClient;
}
