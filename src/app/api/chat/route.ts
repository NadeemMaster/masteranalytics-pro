// ============================================================================
//  MasterAnalytics Pro — /api/chat Route Handler
//  Conversational AI chatbot about the user's campaign data.
//  Accepts a user message + optional filters, fetches the relevant data from
//  Supabase, and streams a Groq LLaMA-3 response.
//
//  Auth: requires a valid session (RLS also enforces user_id ownership).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { getGroqClient, getGroqModel } from "@/lib/groq/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
  campaign?: string;
  tehsil?: string;
  uc?: string;
  day?: string; // "all" | "1" | "2" | "3" | "4"
}

interface ChatResponse {
  reply: string;
  error?: string;
}

// ---------------------------------------------------------------------------
//  System prompt — sets the AI's role as a data analyst assistant
// ---------------------------------------------------------------------------

function buildChatSystemPrompt(): string {
  return `You are MasterAnalytics Pro, an AI assistant that helps public health officials analyze polio campaign (SIA) data.

Your role:
- Answer questions about the campaign data provided in the context.
- Provide specific numbers, percentages, and UC/tehsil names from the data.
- Identify trends, underperforming areas, high-refusal zones, and coverage gaps.
- Suggest actionable recommendations when asked.
- Be concise and direct. Use bullet points for lists.
- If the data doesn't contain the answer, say so honestly.

Formatting rules:
- Use **bold** for key metrics and UC/tehsil names.
- Use plain text for prose. No markdown headers (#).
- Keep responses under 250 words unless the user asks for detail.
- Always cite the actual numbers from the provided data context.`;
}

// ---------------------------------------------------------------------------
//  Build a data context string from the fetched rows
// ---------------------------------------------------------------------------

function buildDataContext(
  campaign: string,
  tehsil: string | undefined,
  uc: string | undefined,
  day: string,
  dailyRows: Record<string, unknown>[],
  catchupRows: Record<string, unknown>[]
): string {
  const lines: string[] = [];

  lines.push("## Current Data Context");
  lines.push(`- Campaign: ${campaign}`);
  if (tehsil) lines.push(`- Tehsil filter: ${tehsil}`);
  if (uc) lines.push(`- UC filter: ${uc}`);
  lines.push(`- Day filter: ${day === "all" ? "All days" : `Day ${day}`}`);
  lines.push(`- Daily rows (Days 1-3): ${dailyRows.length}`);
  lines.push(`- Catch-up rows (Day 4): ${catchupRows.length}`);
  lines.push("");

  // Summarize daily rows as a compact table
  if (dailyRows.length > 0) {
    lines.push("## Daily Campaign Data (Days 1-3)");
    lines.push("| Tehsil | UC | Day | Target | OPV Given | Missed NA | Refusals | Teams |");
    lines.push("|---------|-----|-----|--------|-----------|-----------|-----------|-------|");
    const limit = Math.min(dailyRows.length, 50);
    for (let i = 0; i < limit; i++) {
      const r = dailyRows[i];
      lines.push(
        `| ${r.tehsil ?? ""} | ${r.uc_name ?? ""} | ${r.campaign_day ?? ""} | ${r.over_all_target ?? 0} | ${r.opv_given ?? 0} | ${r.missed_na_0_59 ?? 0} | ${r.total_refusal ?? 0} | ${r.teams_reported ?? 0} |`
      );
    }
    if (dailyRows.length > limit) {
      lines.push(`| ... | (${dailyRows.length - limit} more rows) | ... |`);
    }
    lines.push("");

    // Aggregate KPIs
    const totalTarget = sumField(dailyRows, "over_all_target");
    const totalOpv = sumField(dailyRows, "opv_given");
    const totalMissed = sumField(dailyRows, "missed_na_0_59");
    const totalRefusals = sumField(dailyRows, "total_refusal");
    const totalTeams = sumField(dailyRows, "teams_reported");
    const coveragePct = totalTarget > 0 ? ((totalOpv / totalTarget) * 100).toFixed(1) : "0";

    lines.push("## Daily Aggregated KPIs");
    lines.push(`- Total Target: ${totalTarget.toLocaleString()}`);
    lines.push(`- Total OPV Given: ${totalOpv.toLocaleString()}`);
    lines.push(`- Coverage: ${coveragePct}%`);
    lines.push(`- Total Missed (NA 0-59): ${totalMissed.toLocaleString()}`);
    lines.push(`- Total Refusals: ${totalRefusals.toLocaleString()}`);
    lines.push(`- Total Teams Reported: ${totalTeams.toLocaleString()}`);
    lines.push("");
  }

  // Summarize catch-up rows
  if (catchupRows.length > 0) {
    lines.push("## Catch-up Campaign Data (Day 4)");
    lines.push("| Tehsil | UC | Target Missed NA | Covered Missed NA | Total Coverage | Still Missed | Refusals |");
    lines.push("|---------|-----|------------------|-------------------|----------------|--------------|-----------|");
    const limit = Math.min(catchupRows.length, 50);
    for (let i = 0; i < limit; i++) {
      const r = catchupRows[i];
      lines.push(
        `| ${r.tehsil ?? ""} | ${r.uc_name ?? ""} | ${r.target_missed_na ?? 0} | ${r.covered_missed_na ?? 0} | ${r.total_coverage ?? 0} | ${r.still_missed ?? 0} | ${r.total_refusal ?? 0} |`
      );
    }
    if (catchupRows.length > limit) {
      lines.push(`| ... | (${catchupRows.length - limit} more rows) | ... |`);
    }
    lines.push("");
  }

  if (dailyRows.length === 0 && catchupRows.length === 0) {
    lines.push("NOTE: No data rows match the current filters. Inform the user that no campaign data is available for the selected scope.");
  }

  return lines.join("\n");
}

function sumField(rows: Record<string, unknown>[], field: string): number {
  return rows.reduce((sum, r) => {
    const v = r[field];
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

// ---------------------------------------------------------------------------
//  POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse the request body ----
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { message, history = [], campaign, tehsil, uc, day = "all" } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  // ---- 3. Fetch data from Supabase (if a campaign is selected) ----
  let dailyRows: Record<string, unknown>[] = [];
  let catchupRows: Record<string, unknown>[] = [];

  if (campaign) {
    const supabase = await createClient();

    // Daily query
    let dailyQuery = supabase
      .from("daily_campaign_data")
      .select(
        "tehsil, uc_name, campaign_day, over_all_target, opv_given, missed_na_0_59, total_refusal, teams_reported"
      )
      .eq("user_id", user.id)
      .eq("campaign_name", campaign)
      .order("tehsil")
      .order("uc_name")
      .limit(100);

    if (tehsil) dailyQuery = dailyQuery.eq("tehsil", tehsil);
    if (uc) dailyQuery = dailyQuery.eq("uc_name", uc);
    if (day !== "all" && day !== "4") {
      dailyQuery = dailyQuery.eq("campaign_day", parseInt(day, 10));
    }

    const { data: dailyData, error: dailyError } = await dailyQuery;
    if (dailyError) {
      console.error("[chat] daily query error:", dailyError);
    } else {
      dailyRows = (dailyData as Record<string, unknown>[]) ?? [];
    }

    // Catch-up query (only if day is "all" or "4")
    if (day === "all" || day === "4") {
      let catchupQuery = supabase
        .from("catchup_campaign_data")
        .select(
          "tehsil, uc_name, target_missed_na, covered_missed_na, total_coverage, still_missed, total_refusal"
        )
        .eq("user_id", user.id)
        .eq("campaign_name", campaign)
        .order("tehsil")
        .order("uc_name")
        .limit(100);

      if (tehsil) catchupQuery = catchupQuery.eq("tehsil", tehsil);
      if (uc) catchupQuery = catchupQuery.eq("uc_name", uc);

      const { data: catchupData, error: catchupError } = await catchupQuery;
      if (catchupError) {
        console.error("[chat] catchup query error:", catchupError);
      } else {
        catchupRows = (catchupData as Record<string, unknown>[]) ?? [];
      }
    }
  }

  // ---- 4. Build the Groq messages ----
  const dataContext = buildDataContext(
    campaign || "(none selected)",
    tehsil,
    uc,
    day,
    dailyRows,
    catchupRows
  );

  const groqMessages: ChatMessage[] = [
    { role: "user", content: buildChatSystemPrompt() + "\n\n" + dataContext },
    { role: "assistant", content: "Understood. I have the campaign data context. How can I help you analyze it?" },
    // Include up to the last 8 messages of history for context
    ...history.slice(-8),
    { role: "user", content: message },
  ];

  // ---- 5. Call Groq ----
  try {
    const groq = getGroqClient();
    const model = getGroqModel();

    const completion = await groq.chat.completions.create({
      model,
      messages: groqMessages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "I couldn't generate a response. Please try again.";

    const result: ChatResponse = { reply };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[chat] Groq error:", err);
    const msg = err instanceof Error ? err.message : "AI service unavailable.";
    const result: ChatResponse = {
      reply: "",
      error: `AI service error: ${msg}`,
    };
    return NextResponse.json(result, { status: 502 });
  }
}
