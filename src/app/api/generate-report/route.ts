// ============================================================================
//  MasterAnalytics Pro — /api/generate-report Route Handler (Vercel-compatible)
//  Fetches filtered campaign data + AI insights, generates PDF using
//  @react-pdf/renderer (pure JS, no Python).
//
//  This is the Vercel-compatible version — no Python subprocess, no
//  reportlab/matplotlib. Everything runs in the Node.js serverless function.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { createClient, getUser } from "@/lib/supabase/server";
import { getGroqClient, getGroqModel } from "@/lib/groq/client";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseInsightResponse,
  type InsightDataContext,
} from "@/lib/groq/prompt";
import { ReportDocument, type ReportData } from "@/lib/pdf/report-document";
import { addPageNumbers } from "@/lib/pdf/add-page-numbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse query params ----
  const { searchParams } = new URL(request.url);
  const campaignName = searchParams.get("campaign") || "";
  const tehsil = searchParams.get("tehsil") || undefined;
  const ucName = searchParams.get("uc") || undefined;
  const dayParam = searchParams.get("day");
  const day: number | "all" =
    dayParam && ["1", "2", "3", "4"].includes(dayParam)
      ? parseInt(dayParam, 10)
      : "all";
  const includeAI = searchParams.get("ai") !== "false";

  if (!campaignName) {
    return NextResponse.json(
      { error: "Campaign name is required." },
      { status: 400 }
    );
  }

  // ---- 3. Fetch data from Supabase ----
  const supabase = await createClient();

  type DailyRow = {
    tehsil: string;
    uc_name: string;
    campaign_day: number;
    over_all_target: number;
    teams_reported: number;
    opv_given: number;
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

  let dailyQuery = supabase
    .from("daily_campaign_data")
    .select(
      "tehsil, uc_name, campaign_day, over_all_target, teams_reported, opv_given, missed_na_0_59, missed_ref_0_59, total_refusal, medical_refusal, soft_refusal, admin_coverage_pct"
    )
    .eq("user_id", user.id)
    .eq("campaign_name", campaignName);

  if (tehsil) dailyQuery = dailyQuery.eq("tehsil", tehsil);
  if (ucName) dailyQuery = dailyQuery.eq("uc_name", ucName);
  if (day !== "all") dailyQuery = dailyQuery.eq("campaign_day", day);

  const { data: dailyDataRaw, error: dailyError } = await dailyQuery;

  if (dailyError) {
    return NextResponse.json(
      { error: "Failed to fetch daily data.", detail: dailyError.message },
      { status: 500 }
    );
  }

  const dailyData = (dailyDataRaw as unknown as DailyRow[]) ?? [];

  let catchupQuery = supabase
    .from("catchup_campaign_data")
    .select(
      "tehsil, uc_name, target_missed_na, target_missed_ref, covered_missed_na, covered_missed_ref, total_coverage, still_missed, total_refusal"
    )
    .eq("user_id", user.id)
    .eq("campaign_name", campaignName);

  if (tehsil) catchupQuery = catchupQuery.eq("tehsil", tehsil);
  if (ucName) catchupQuery = catchupQuery.eq("uc_name", ucName);

  const { data: catchupDataRaw } = await catchupQuery;
  const catchupData = (catchupDataRaw as unknown as CatchupRow[]) ?? [];

  if (!dailyData || dailyData.length === 0) {
    return NextResponse.json(
      { error: "No data found for the selected filters." },
      { status: 404 }
    );
  }

  // ---- 4. Aggregate KPIs ----
  const kpis = {
    totalTarget: dailyData.reduce((s, r) => s + (r.over_all_target || 0), 0),
    opvCovered: dailyData.reduce((s, r) => s + (r.opv_given || 0), 0),
    coveragePct: 0,
    missedChildren: dailyData.reduce(
      (s, r) => s + (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0),
      0
    ),
    refusals: dailyData.reduce((s, r) => s + (r.total_refusal || 0), 0),
    teamsReported: dailyData.reduce((s, r) => s + (r.teams_reported || 0), 0),
  };
  kpis.coveragePct =
    kpis.totalTarget > 0 ? (kpis.opvCovered / kpis.totalTarget) * 100 : 0;

  // ---- 5. Build UC breakdown ----
  const ucMap = new Map<
    string,
    {
      uc_name: string;
      tehsil: string;
      over_all_target: number;
      opv_given: number;
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
      opv_given: 0,
      missed_children: 0,
      refusals: 0,
      teams_reported: 0,
    };
    existing.over_all_target = r.over_all_target || 0;
    existing.opv_given = r.opv_given || 0;
    existing.missed_children = (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0);
    existing.refusals = r.total_refusal || 0;
    existing.teams_reported = r.teams_reported || 0;
    ucMap.set(key, existing);
  }

  const ucBreakdown = Array.from(ucMap.values()).map((uc) => ({
    ...uc,
    coverage_pct:
      uc.over_all_target > 0 ? (uc.opv_given / uc.over_all_target) * 100 : 0,
  }));

  // ---- 6. Build day breakdown ----
  let dayBreakdown: InsightDataContext["dayBreakdown"] = [];
  if (day === "all") {
    const dayMap = new Map<
      number,
      { opv_given: number; missed_children: number; refusals: number }
    >();
    for (const r of dailyData) {
      const d = r.campaign_day;
      const existing = dayMap.get(d) || {
        opv_given: 0,
        missed_children: 0,
        refusals: 0,
      };
      existing.opv_given += r.opv_given || 0;
      existing.missed_children +=
        (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0);
      existing.refusals += r.total_refusal || 0;
      dayMap.set(d, existing);
    }
    dayBreakdown = Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, vals]) => ({ day, ...vals }));

    if (catchupData.length > 0) {
      const day4Totals = catchupData.reduce(
        (acc, r) => ({
          opv_given: acc.opv_given + (r.total_coverage || 0),
          missed_children: acc.missed_children + (r.still_missed || 0),
          refusals: acc.refusals + (r.total_refusal || 0),
        }),
        { opv_given: 0, missed_children: 0, refusals: 0 }
      );
      dayBreakdown.push({ day: 4, ...day4Totals });
    }
  }

  // ---- 7. Fetch AI insights (optional) ----
  let insights = null;
  if (includeAI) {
    try {
      const ctx: InsightDataContext = {
        campaignName,
        tehsil,
        ucName,
        day,
        kpis,
        ucBreakdown,
        dayBreakdown,
      };

      const groq = getGroqClient();
      const model = getGroqModel();

      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(ctx) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const aiContent = completion.choices[0]?.message?.content || "";
      insights = parseInsightResponse(aiContent);
    } catch (err) {
      console.error("[generate-report] AI insights failed (non-fatal):", err);
    }
  }

  // ---- 8. Build report data ----
  const reportData: ReportData = {
    campaign: campaignName,
    filters: { tehsil, ucName, day },
    kpis,
    ucBreakdown,
    dayBreakdown,
    insights,
    generatedAt: new Date().toISOString(),
  };

  // ---- 9. Render PDF using @react-pdf/renderer ----
  try {
    // Cast to any to work around @react-pdf/renderer's generic type mismatch
    // between React.createElement output and renderToBuffer's expected input.
    const rawPdfBuffer = (await renderToBuffer(
      React.createElement(ReportDocument, { data: reportData }) as any
    )) as Uint8Array;

    // Post-process: add "Page 01/10" footers using pdf-lib
    // (react-pdf's `fixed` prop doesn't work reliably for dynamic page numbers)
    const pdfBuffer = await addPageNumbers(rawPdfBuffer);

    // ---- 10. Return PDF as download ----
    const today = new Date().toISOString().slice(0, 10);
    const safeCampaign = campaignName
      .replace(/[^a-zA-Z0-9\-_ ]/g, "")
      .trim()
      .replace(/ /g, "_");
    // English-only filename (no CJK)
    const filename = `${safeCampaign}_Analysis_Report_${today}.pdf`;

    // Convert to a Uint8Array and then to a Buffer for NextResponse.
    // Multiple casts needed to satisfy TS's strict ArrayBuffer vs SharedArrayBuffer typing.
    const uint8 =
      pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const nodeBuffer = Buffer.from(
      uint8.buffer as ArrayBuffer,
      uint8.byteOffset,
      uint8.byteLength
    );

    return new NextResponse(nodeBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(nodeBuffer.length),
        "X-Generated-At": reportData.generatedAt,
      },
    });
  } catch (err) {
    console.error("[generate-report] PDF render error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate PDF report.",
        detail: err instanceof Error ? err.message : "Unknown rendering error",
      },
      { status: 500 }
    );
  }
}
