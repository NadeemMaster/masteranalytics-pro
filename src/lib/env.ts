// ============================================================================
//  MasterAnalytics Pro — Environment Variable Validation
//  Importing this file anywhere validates that required env vars are present.
//  Throws a clear error at startup instead of failing silently later.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("YOUR-")) {
    throw new Error(
      `\n\n❌ Missing required env var: ${name}\n` +
        `   Add it to .env.local (see .env.example for a template).\n` +
        `   Current value: "${value ?? "<undefined>"}"\n`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
} as const;

/**
 * True if all Supabase + Groq credentials are configured.
 * Use to conditionally show a "configuration needed" banner in dev.
 */
export const isConfigured =
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("YOUR-") &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("YOUR-") &&
  !process.env.GROQ_API_KEY?.startsWith("YOUR-");
