// ============================================================================
//  MasterAnalytics Pro — /api/generate-report Route Handler
//  Fetches filtered campaign data + AI insights, invokes the Python report
//  generator (reportlab), and returns the PDF download path.
//
//  Spec compliance (Data Analysis Report Prompt):
//    - Library: reportlab (Python)
//    - Page: A4, margins 2.5cm/2cm
//    - Header: report title, right-aligned, 10pt (excluded on cover)
//    - Footer: page number centered (excluded on cover)
//    - Bookmarks: auto-generated from Heading 1/2/3
//    - Images: >=150 DPI, aspect ratio locked, width <=80% page
//    - File size: <=10MB
//    - 7 sections: Scope, Data Quality, Core Performance, Comparisons,
//                  Attribution, Insights & Action Plan, Uncertainty
//    - File naming: [主题]_分析报告_[YYYY-MM-DD].pdf
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { createClient, getUser } from "@/lib/supabase/server";
import { getGroqClient, getGroqModel } from "@/lib/groq/client";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseInsightResponse,
  type InsightDataContext,
} from "@/lib/groq/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds — Python + Groq may take time

const REPORT_SCRIPT = join(
  process.cwd(),
  "scripts",
  "report",
  "generate_report.py"
);

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
  const includeAI = searchParams.get("ai") !== "false"; // default true

  if (!campaignName) {
    return NextResponse.json(
      { error: "Campaign name is required." },
      { status: 400 }
    );
  }

  // ---- 3. Fetch data from Supabase (same logic as /api/ai-insights) ----
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
  const ucMap = new Map<string, {
    uc_name: string;
    tehsil: string;
    over_all_target: number;
    opv_given: number;
    missed_children: number;
    refusals: number;
    teams_reported: number;
  }>();

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
    const dayMap = new Map<number, { opv_given: number; missed_children: number; refusals: number }>();
    for (const r of dailyData) {
      const d = r.campaign_day;
      const existing = dayMap.get(d) || { opv_given: 0, missed_children: 0, refusals: 0 };
      existing.opv_given += r.opv_given || 0;
      existing.missed_children += (r.missed_na_0_59 || 0) + (r.missed_ref_0_59 || 0);
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
      // Continue without AI insights — the report will note they're unavailable
    }
  }

  // ---- 8. Prepare data for Python script ----
  const reportData = {
    campaign: campaignName,
    filters: { tehsil, ucName, day },
    kpis,
    ucBreakdown,
    dayBreakdown,
    insights,
  };

  // Write data to a temp JSON file
  const tmpFile = join(tmpdir(), `report-data-${Date.now()}.json`);
  await writeFile(tmpFile, JSON.stringify(reportData), "utf-8");

  // ---- 9. Invoke Python script ----
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn("python3", [REPORT_SCRIPT], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd(),
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Python script failed (exit ${code}): ${stderr.slice(-500)}`
            )
          );
        } else {
          resolve(stdout.trim());
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to spawn Python: ${err.message}`));
      });

      // Send JSON data via stdin
      proc.stdin.write(JSON.stringify(reportData));
      proc.stdin.end();
    });

    // Parse Python output
    const pyResult = JSON.parse(result);

    if (!pyResult.success) {
      throw new Error(pyResult.error || "Python script reported failure");
    }

    // ---- 10. Read the generated PDF and return it ----
    const pdfPath = pyResult.path;
    const pdfBuffer = await readFile(pdfPath);

    // Clean up temp file
    await unlink(tmpFile).catch(() => {});

    // Return the PDF as a download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(pyResult.filename)}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "X-Report-Path": encodeURIComponent(pdfPath),
        "X-Generated-At": pyResult.generatedAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[generate-report] Error:", err);
    await unlink(tmpFile).catch(() => {});

    return NextResponse.json(
      {
        error: "Failed to generate PDF report.",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
