// ============================================================================
//  MasterAnalytics Pro — Next.js Middleware Entry Point
//  Next.js requires the middleware file at src/middleware.ts (or root).
//  We delegate to the Supabase session-refresh helper in lib/supabase.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Match all paths EXCEPT:
 *  - _next/static, _next/image, favicon.ico (static assets)
 *  - api routes that start with /api/auth (handled by Supabase callback)
 *  - any file with an extension (e.g. .png, .css)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)",
  ],
};
