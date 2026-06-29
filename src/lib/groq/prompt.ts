// ============================================================================
//  MasterAnalytics Pro — Groq Prompt Builder
//  Constructs the system + user prompts for AI insight generation.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

export interface InsightDataContext {
  campaignName: string;
  tehsil?: string;
  ucName?: string;
  day?: number | "all";
  kpis: {
    totalTarget: number;
    opvIssued: number;
    adminCoverage: number;
    coveragePct: number;
    missedChildren: number;
    refusals: number;
    teamsReported: number;
  };
  ucBreakdown: Array<{
    uc_name: string;
    tehsil: string;
    over_all_target: number;
    opv_issued: number;
    admin_coverage: number;
    coverage_pct: number;
    missed_children: number;
    refusals: number;
    teams_reported: number;
  }>;
  dayBreakdown?: Array<{
    day: number;
    opv_issued: number;
    missed_children: number;
    refusals: number;
  }>;
}

/**
 * Build the system prompt — sets the AI's role and output format.
 */
export function buildSystemPrompt(): string {
  return `You are a senior public health analyst specializing in polio immunization campaigns (SIA — Supplementary Immunization Activities). You analyze campaign data to identify underperforming areas, high-refusal zones, and coverage gaps.

Your task: Analyze the provided polio campaign data and produce actionable insights.

OUTPUT FORMAT (strict — follow exactly):
Return a JSON object with this structure:
{
  "summary": "A 2-3 sentence executive summary of the campaign's overall performance.",
  "keyFindings": [
    "Finding 1 with specific numbers",
    "Finding 2 with specific numbers",
    "Finding 3 with specific numbers"
  ],
  "underperformingUCs": [
    {
      "uc_name": "UC name",
      "tehsil": "Tehsil name",
      "issue": "Specific issue (e.g., low coverage, high refusals)",
      "metric": "The key metric value",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "highRefusalAreas": [
    {
      "uc_name": "UC name",
      "tehsil": "Tehsil name",
      "total_refusals": number,
      "refusal_type": "medical | soft | total",
      "recommendation": "Specific strategy to address refusals"
    }
  ],
  "recommendations": [
    "Recommendation 1 with priority (HIGH/MEDIUM/LOW) and expected impact",
    "Recommendation 2 with priority and expected impact",
    "Recommendation 3 with priority and expected impact"
  ]
}

RULES:
- Use SPECIFIC NUMBERS from the data (percentages, counts, UC names).
- Identify the BOTTOM 3-5 UCs by coverage percentage as "underperforming".
- Identify the TOP 3-5 UCs by refusal count as "high refusal areas".
- Recommendations must be actionable (e.g., "Deploy additional teams to UC X", "Engage local religious leaders in tehsil Y").
- If coverage < 80%, flag as critical. If < 95%, flag as needs improvement. If >= 95%, acknowledge as good.
- Return ONLY valid JSON — no markdown, no code fences, no preamble.`;
}

/**
 * Build the user prompt — includes the actual campaign data.
 */
export function buildUserPrompt(ctx: InsightDataContext): string {
  const lines: string[] = [];

  lines.push("Analyze the following polio campaign data and provide insights.\n");

  // Scope
  lines.push("## Campaign Scope");
  lines.push(`- Campaign: ${ctx.campaignName}`);
  if (ctx.tehsil) lines.push(`- Tehsil: ${ctx.tehsil}`);
  if (ctx.ucName) lines.push(`- UC: ${ctx.ucName}`);
  lines.push(`- Day filter: ${ctx.day === "all" ? "All days" : `Day ${ctx.day}`}`);
  lines.push("");

  // KPIs
  lines.push("## Key Performance Indicators (Aggregated)");
  lines.push(`- Total Target (children 0-59): ${ctx.kpis.totalTarget.toLocaleString()}`);
  lines.push(`- OPV Issued: ${ctx.kpis.opvIssued.toLocaleString()}`);
  lines.push(`- Admin Coverage: ${ctx.kpis.adminCoverage.toLocaleString()}`);
  lines.push(`- Admin Coverage %: ${ctx.kpis.coveragePct.toFixed(2)}%`);
  lines.push(`- Missed Children: ${ctx.kpis.missedChildren.toLocaleString()}`);
  lines.push(`- Total Refusals: ${ctx.kpis.refusals.toLocaleString()}`);
  lines.push(`- Teams Reported: ${ctx.kpis.teamsReported.toLocaleString()}`);
  lines.push("");

  // Day breakdown
  if (ctx.dayBreakdown && ctx.dayBreakdown.length > 0) {
    lines.push("## Day-by-Day Breakdown");
    lines.push("| Day | OPV Issued | Missed Children | Refusals |");
    lines.push("|-----|-----------|-----------------|----------|");
    for (const d of ctx.dayBreakdown) {
      lines.push(
        `| Day ${d.day} | ${d.opv_issued.toLocaleString()} | ${d.missed_children.toLocaleString()} | ${d.refusals.toLocaleString()} |`
      );
    }
    lines.push("");
  }

  // UC breakdown
  lines.push("## UC-wise Breakdown");
  lines.push("| UC Name | Tehsil | Target | OPV Issued | Admin Coverage % | Missed | Refusals | Teams |");
  lines.push("|---------|--------|--------|-----------|------------|--------|-----------|-------|");
  for (const uc of ctx.ucBreakdown) {
    lines.push(
      `| ${uc.uc_name} | ${uc.tehsil} | ${uc.over_all_target.toLocaleString()} | ${uc.opv_issued.toLocaleString()} | ${uc.coverage_pct.toFixed(1)}% | ${uc.missed_children.toLocaleString()} | ${uc.refusals.toLocaleString()} | ${uc.teams_reported} |`
    );
  }
  lines.push("");

  lines.push("Provide your analysis as a JSON object following the specified format.");

  return lines.join("\n");
}

/**
 * Parse the AI response. Groq may return JSON with or without markdown fences.
 */
export interface AiInsights {
  summary: string;
  keyFindings: string[];
  underperformingUCs: Array<{
    uc_name: string;
    tehsil: string;
    issue: string;
    metric: string;
    recommendation: string;
  }>;
  highRefusalAreas: Array<{
    uc_name: string;
    tehsil: string;
    total_refusals: number;
    refusal_type: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

export function parseInsightResponse(content: string): AiInsights {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```$/, "");
  }

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI response does not contain valid JSON.");
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonStr);

  // Validate required fields
  if (!parsed.summary || typeof parsed.summary !== "string") {
    parsed.summary = "Analysis unavailable.";
  }
  if (!Array.isArray(parsed.keyFindings)) parsed.keyFindings = [];
  if (!Array.isArray(parsed.underperformingUCs)) parsed.underperformingUCs = [];
  if (!Array.isArray(parsed.highRefusalAreas)) parsed.highRefusalAreas = [];
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

  return parsed as AiInsights;
}
