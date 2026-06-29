// ============================================================================
//  MasterAnalytics Pro — /api/ai-insights Route Handler
//  Fetches filtered campaign data, sends to Groq LLaMA-3 for analysis.
//  Returns structured insights: summary, key findings, underperforming UCs,
//  high-refusal areas, and recommendations.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { getGroqClient, getGroqModel } from "@/lib/groq/client";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseInsightResponse,
  type InsightDataContext,
  type AiInsights,
} from "@/lib/groq/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse query params (filters) ----
  const { searchParams } = new URL(request.url);
  const campaignName = searchParams.get("campaign") || "";
  const tehsil = searchParams.get("tehsil") || undefined;
  const ucName = searchParams.get("uc") || undefined;
  const dayParam = searchParams.get("day");
  const day: number | "all" =
    dayParam && ["1", "2", "3", "4"].includes(dayParam)
      ? parseInt(dayParam, 10)
      : "all";

  if (!campaignName) {
    return NextResponse.json(
      { error: "Campaign name is required. Use ?campaign=NID+FEB+2026" },
      { status: 400 }
    );
  }

  // ---- 3. Fetch data from Supabase ----
  // Type the query results explicitly (Supabase generic resolution falls back
  // to `never` in some setups; we cast to a known shape).
  type DailyRow = {
    tehsil: string;
    uc_name: string;
    campaign_day: number;
    over_all_target: number;
    teams_reported: number;
    opv_issued: number;
    admin_coverage: number;
    missed_na_0_59: number;
    missed_ref_0_59: number;
    total_refusal: number;
    medical_refusal: number;
    soft_refusal: number;
    admin_coverage_pct: number;
  };

  type CatchupRow = {
    tehsil: string;
    uc_name: string;
    target_missed_na: number;
    target_missed_ref: number;
    covered_missed_na: number;
    covered_missed_ref: number;
    total_coverage: number;
    still_missed: number;
    total_refusal: number;
  };

  const supabase = await createClient();

  // Build daily query
  let dailyQuery = supabase
    .from("daily_campaign_data")
    .select(
      "tehsil, uc_name, campaign_day, over_all_target, teams_reported, opv_issued, admin_coverage, missed_na_0_59, missed_ref_0_59, total_refusal, medical_refusal, soft_refusal, admin_coverage_pct"
    )
    .eq("user_id", user.id)
    .eq("campaign_name", campaignName);

  if (tehsil) dailyQuery = dailyQuery.eq("tehsil", tehsil);
  if (ucName) dailyQuery = dailyQuery.eq("uc_name", ucName);
  if (day !== "all") dailyQuery = dailyQuery.eq("campaign_day", day);

  const { data: dailyDataRaw, error: dailyError } = await dailyQuery;

  if (dailyError) {
    console.error("[ai-insights] daily query error:", dailyError);
    return NextResponse.json(
      { error: "Failed to fetch daily data.", detail: dailyError.message },
      { status: 500 }
    );
  }

  const dailyData = (dailyDataRaw as unknown as DailyRow[]) ?? [];

  // Build catchup query (Day 4)
  let catchupQuery = supabase
    .from("catchup_campaign_data")
    .select(
      "tehsil, uc_name, target_missed_na, target_missed_ref, covered_missed_na, covered_missed_ref, total_coverage, still_missed, total_refusal"
    )
    .eq("user_id", user.id)
    .eq("campaign_name", campaignName);

  if (tehsil) catchupQuery = catchupQuery.eq("tehsil", tehsil);
  if (ucName) catchupQuery = catchupQuery.eq("uc_name", ucName);

  const { data: catchupDataRaw, error: catchupError } = await catchupQuery;

  if (catchupError) {
    console.error("[ai-insights] catchup query error:", catchupError);
    // Non-fatal — continue with daily data only
  }

  const catchupData = (catchupDataRaw as unknown as CatchupRow[]) ?? [];

  if (!dailyData || dailyData.length === 0) {
    return NextResponse.json(
      {
        error: "No data found for the selected filters. Upload campaign data first.",
      },
      { status: 404 }
    );
  }

  // ---- 4. Aggregate KPIs ----
  const kpis = {
    totalTarget: dailyData.reduce((s, r) => s + (r.over_all_target || 0), 0),
    opvIssued: dailyData.reduce((s, r) => s + (r.opv_issued || 0), 0),
    adminCoverage: dailyData.reduce((s, r) => s + (r.admin_coverage || 0), 0),
    coveragePct: 0, // computed below
    missedChildren: dailyData.reduce(
      (s, r) => s + (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0),
      0
    ),
    refusals: dailyData.reduce((s, r) => s + (r.total_refusal || 0), 0),
    teamsReported: dailyData.reduce((s, r) => s + (r.teams_reported || 0), 0),
  };
  kpis.coveragePct =
    kpis.totalTarget > 0 ? (kpis.adminCoverage / kpis.totalTarget) * 100 : 0;

  // ---- 5. Build UC breakdown ----
  const ucMap = new Map<
    string,
    {
      uc_name: string;
      tehsil: string;
      over_all_target: number;
      opv_issued: number;
      admin_coverage: number;
      missed_children: number;
      refusals: number;
      teams_reported: number;
    }
  >();

  for (const r of dailyData) {
    const key = `${r.tehsil}|||${r.uc_name}`;
    const existing = ucMap.get(key) || {
      uc_name: r.uc_name,
      tehsil: r.tehsil,
      over_all_target: 0,
      opv_issued: 0,
      admin_coverage: 0,
      missed_children: 0,
      refusals: 0,
      teams_reported: 0,
    };
    // For cumulative days 1-3, the latest day's data is what matters.
    // Since upsert replaces, each UC has only ONE row (the latest day).
    // So we can safely take the values as-is.
    existing.over_all_target = r.over_all_target || 0;
    existing.opv_issued = r.opv_issued || 0;
    existing.admin_coverage = r.admin_coverage || 0;
    existing.missed_children =
      (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0);
    existing.refusals = r.total_refusal || 0;
    existing.teams_reported = r.teams_reported || 0;
    ucMap.set(key, existing);
  }

  const ucBreakdown = Array.from(ucMap.values()).map((uc) => ({
    ...uc,
    coverage_pct:
      uc.over_all_target > 0 ? (uc.admin_coverage / uc.over_all_target) * 100 : 0,
  }));

  // ---- 6. Build day breakdown (if "all" days) ----
  let dayBreakdown: InsightDataContext["dayBreakdown"] = [];
  if (day === "all") {
    const dayMap = new Map<number, { opv_issued: number; missed_children: number; refusals: number }>();
    for (const r of dailyData) {
      const d = r.campaign_day;
      const existing = dayMap.get(d) || { opv_issued: 0, missed_children: 0, refusals: 0 };
      existing.opv_issued += r.opv_issued || 0;
      existing.missed_children += (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0);
      existing.refusals += r.total_refusal || 0;
      dayMap.set(d, existing);
    }
    dayBreakdown = Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, vals]) => ({ day, ...vals }));

    // Add Day 4 from catchup data
    if (catchupData && catchupData.length > 0) {
      const day4Totals = catchupData.reduce(
        (acc, r) => ({
          opv_issued: acc.opv_issued + (r.total_coverage || 0),
          missed_children: acc.missed_children + (r.still_missed || 0),
          refusals: acc.refusals + (r.total_refusal || 0),
        }),
        { opv_issued: 0, missed_children: 0, refusals: 0 }
      );
      dayBreakdown.push({ day: 4, ...day4Totals });
    }
  }

  // ---- 7. Build prompt context ----
  const ctx: InsightDataContext = {
    campaignName,
    tehsil,
    ucName,
    day,
    kpis,
    ucBreakdown,
    dayBreakdown,
  };

  // ---- 8. Call Groq AI ----
  let aiContent: string;
  try {
    const groq = getGroqClient();
    const model = getGroqModel();

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(ctx) },
      ],
      temperature: 0.3, // low temp for factual analysis
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    aiContent = completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("[ai-insights] Groq API error:", err);
    return NextResponse.json(
      {
        error: "AI analysis failed.",
        detail: err instanceof Error ? err.message : "Unknown AI error",
      },
      { status: 502 }
    );
  }

  // ---- 9. Parse AI response ----
  let insights: AiInsights;
  try {
    insights = parseInsightResponse(aiContent);
  } catch (err) {
    console.error("[ai-insights] Parse error:", err);
    return NextResponse.json(
      {
        error: "AI returned an invalid response format.",
        rawContent: aiContent.slice(0, 500),
      },
      { status: 502 }
    );
  }

  // ---- 10. Return ----
  return NextResponse.json({
    success: true,
    campaign: campaignName,
    filters: { tehsil, ucName, day },
    kpis,
    insights,
    generatedAt: new Date().toISOString(),
  });
}
