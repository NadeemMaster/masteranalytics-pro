// ============================================================================
//  MasterAnalytics Pro — /api/campaign-comparison Route Handler
//  Returns side-by-side KPIs for two campaigns (current vs previous).
//
//  Query params:
//    current   string  required  current campaign name
//    previous  string  required  previous campaign name
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { fetchCampaignKpis } from "@/lib/dashboard/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  const params = request.nextUrl.searchParams;
  const current = params.get("current");
  const previous = params.get("previous");

  if (!current || !previous) {
    return NextResponse.json(
      { error: "Both 'current' and 'previous' campaign names are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const [currentKpis, previousKpis] = await Promise.all([
    fetchCampaignKpis(supabase, user.id, current),
    fetchCampaignKpis(supabase, user.id, previous),
  ]);

  return NextResponse.json({
    success: true,
    current: { campaign: current, kpis: currentKpis },
    previous: { campaign: previous, kpis: previousKpis },
  });
}
