// ============================================================================
//  MasterAnalytics Pro — /api/dashboard-data Route Handler
//  Returns aggregated KPIs, day-by-day breakdown, UC breakdown, and raw rows
//  for the given filter parameters.
//
//  Auth: requires a valid session (RLS also enforces user_id ownership).
//
//  Query params:
//    campaign  string  optional  campaign_name filter
//    tehsil    string  optional  tehsil filter
//    uc        string  optional  uc_name filter
//    day       string  optional  '1' | '2' | '3' | '4' | 'all'  (default 'all')
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import {
  fetchDashboardData,
  type DayFilter,
} from "@/lib/dashboard/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DAYS: DayFilter[] = ["1", "2", "3", "4", "all"];

function parseDay(value: string | null): DayFilter {
  if (!value) return "all";
  const v = value.toLowerCase();
  if (VALID_DAYS.includes(v as DayFilter)) return v as DayFilter;
  return "all";
}

export async function GET(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse filters ----
  const params = request.nextUrl.searchParams;
  const filters = {
    campaign: params.get("campaign") || undefined,
    tehsil: params.get("tehsil") || undefined,
    uc: params.get("uc") || undefined,
    day: parseDay(params.get("day")),
  };

  // ---- 3. Fetch aggregated data ----
  const supabase = await createClient();
  const data = await fetchDashboardData(supabase, user.id, filters);

  return NextResponse.json({
    success: true,
    filters,
    ...data,
  });
}
