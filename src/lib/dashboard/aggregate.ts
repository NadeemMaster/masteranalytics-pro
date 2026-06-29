// ============================================================================
//  MasterAnalytics Pro — Dashboard Aggregation Helpers
//  Shared between /api/dashboard-data (Route Handler) and /dashboard page
//  (Server Component) so the initial render is server-side and subsequent
//  filter changes go through the API.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import type { createClient as createServerClient } from "@/lib/supabase/server";

// Use the actual type returned by `await createClient()` from the server helper.
// We intentionally avoid the `SupabaseClient` alias in src/types/database.ts
// because that alias omits the schema-name generic parameter that newer
// @supabase/supabase-js versions require.
type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type DayFilter = "1" | "2" | "3" | "4" | "all";

export interface DashboardFilters {
  campaign?: string; // campaign_name
  tehsil?: string;
  uc?: string; // uc_name
  day?: DayFilter;
}

export interface DashboardKpis {
  totalTarget: number;
  opvIssued: number;
  adminCoverage: number;
  coveragePct: number; // 0-100 (admin coverage against target)
  missedChildren: number;
  refusals: number;
  teamsReported: number;
}

export interface DayBreakdownRow {
  day: number;
  opv: number;
  missed: number;
  refusals: number;
  target: number;
}

export interface UcBreakdownRow {
  uc: string;
  tehsil: string;
  opv: number;
  adminCoverage: number;
  target: number;
  coveragePct: number; // 0-100 (admin coverage against target)
  missed: number;
  refusals: number;
  day: number;
}

export interface DashboardRow {
  tehsil: string;
  uc: string;
  campaign_day: number;
  over_all_target: number;
  opv_issued: number;
  missed_na_0_59: number;
  total_refusal: number;
  teams_reported: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  dayBreakdown: DayBreakdownRow[];
  ucBreakdown: UcBreakdownRow[];
  rows: DashboardRow[];
}

export interface FilterOptions {
  campaigns: string[];
  tehsilsByCampaign: Record<string, string[]>;
  ucsByCampaignTehsil: Record<string, Record<string, string[]>>;
  days: number[]; // distinct campaign_days present in user's data
}

// ---------------------------------------------------------------------------
//  Row shape returned from Supabase (subset of columns we need)
// ---------------------------------------------------------------------------

interface DailyRow {
  campaign_name: string;
  tehsil: string;
  uc_name: string;
  campaign_day: number;
  over_all_target: number;
  opv_issued: number;
  admin_coverage: number;
  missed_na_0_59: number;
  total_refusal: number;
  teams_reported: number;
}

interface CatchupRow {
  campaign_name: string;
  tehsil: string;
  uc_name: string;
  campaign_day: number;
  opv_issued: number;
  total_coverage: number;
  still_missed: number;
  total_refusal: number;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

const DAILY_COLUMNS =
  "campaign_name, tehsil, uc_name, campaign_day, over_all_target, opv_issued, admin_coverage, missed_na_0_59, total_refusal, teams_reported";

const CATCHUP_COLUMNS =
  "campaign_name, tehsil, uc_name, campaign_day, opv_issued, total_coverage, still_missed, total_refusal";

function safePct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

/**
 * Build filter options (campaigns, tehsils per campaign, UCs per
 * campaign+tehsil, distinct days) from raw identifier rows fetched from
 * both daily + catchup tables.
 */
export function buildFilterOptions(
  dailyRows: { campaign_name: string; tehsil: string; uc_name: string; campaign_day: number }[],
  catchupRows: { campaign_name: string; tehsil: string; uc_name: string; campaign_day: number }[]
): FilterOptions {
  const campaigns = new Set<string>();
  const tehsilsByCampaign: Record<string, Set<string>> = {};
  const ucsByCampaignTehsil: Record<string, Record<string, Set<string>>> = {};
  const days = new Set<number>();

  const ingest = (
    row: { campaign_name: string; tehsil: string; uc_name: string; campaign_day: number }
  ) => {
    const { campaign_name, tehsil, uc_name, campaign_day } = row;
    if (!campaign_name) return;
    campaigns.add(campaign_name);
    days.add(campaign_day);

    if (!tehsilsByCampaign[campaign_name]) {
      tehsilsByCampaign[campaign_name] = new Set();
    }
    if (tehsil) tehsilsByCampaign[campaign_name].add(tehsil);

    if (!ucsByCampaignTehsil[campaign_name]) {
      ucsByCampaignTehsil[campaign_name] = {};
    }
    if (!ucsByCampaignTehsil[campaign_name][tehsil]) {
      ucsByCampaignTehsil[campaign_name][tehsil] = new Set();
    }
    if (uc_name) ucsByCampaignTehsil[campaign_name][tehsil].add(uc_name);
  };

  dailyRows.forEach(ingest);
  catchupRows.forEach(ingest);

  return {
    campaigns: Array.from(campaigns).sort((a, b) => a.localeCompare(b)),
    tehsilsByCampaign: Object.fromEntries(
      Object.entries(tehsilsByCampaign).map(([k, v]) => [
        k,
        Array.from(v).sort((a, b) => a.localeCompare(b)),
      ])
    ),
    ucsByCampaignTehsil: Object.fromEntries(
      Object.entries(ucsByCampaignTehsil).map(([c, tehsils]) => [
        c,
        Object.fromEntries(
          Object.entries(tehsils).map(([t, ucs]) => [
            t,
            Array.from(ucs).sort((a, b) => a.localeCompare(b)),
          ])
        ),
      ])
    ),
    days: Array.from(days).sort((a, b) => a - b),
  };
}

/**
 * Fetch aggregated dashboard data for the given filters.
 *
 * Strategy:
 *   - Always query BOTH daily + catchup tables in parallel (each filtered by
 *     user_id + the optional campaign/tehsil/uc filters).
 *   - The `day` filter narrows the daily query (1|2|3) or catchup query (4).
 *     When day='all', both queries run unfiltered by day.
 *   - KPIs aggregate the filtered dataset (daily + catchup).
 *   - Day-by-day breakdown sums per campaign_day (1-4).
 *   - UC breakdown groups by (tehsil, uc_name) using the latest daily row +
 *     catchup row if present.
 *
 * RLS already enforces user_id = auth.uid(), but we add explicit .eq() too.
 */
export async function fetchDashboardData(
  supabase: ServerSupabaseClient,
  userId: string,
  filters: DashboardFilters
): Promise<DashboardData> {
  const { campaign, tehsil, uc, day } = filters;

  // ---- Build daily query ----
  let dailyQuery = supabase
    .from("daily_campaign_data")
    .select(DAILY_COLUMNS)
    .eq("user_id", userId);

  if (campaign) dailyQuery = dailyQuery.eq("campaign_name", campaign);
  if (tehsil) dailyQuery = dailyQuery.eq("tehsil", tehsil);
  if (uc) dailyQuery = dailyQuery.eq("uc_name", uc);
  if (day && day !== "all" && day !== "4") {
    dailyQuery = dailyQuery.eq("campaign_day", Number(day));
  }

  // ---- Build catchup query ----
  let catchupQuery = supabase
    .from("catchup_campaign_data")
    .select(CATCHUP_COLUMNS)
    .eq("user_id", userId);

  if (campaign) catchupQuery = catchupQuery.eq("campaign_name", campaign);
  if (tehsil) catchupQuery = catchupQuery.eq("tehsil", tehsil);
  if (uc) catchupQuery = catchupQuery.eq("uc_name", uc);

  const shouldFetchDaily = !day || day === "all" || day === "1" || day === "2" || day === "3";
  const shouldFetchCatchup = !day || day === "all" || day === "4";

  const [dailyRes, catchupRes] = await Promise.all([
    shouldFetchDaily ? dailyQuery : Promise.resolve({ data: [], error: null }),
    shouldFetchCatchup ? catchupQuery : Promise.resolve({ data: [], error: null }),
  ]);

  if (dailyRes.error) {
    console.error("[dashboard-data] daily query error:", dailyRes.error);
  }
  if (catchupRes.error) {
    console.error("[dashboard-data] catchup query error:", catchupRes.error);
  }

  const dailyRows = (dailyRes.data ?? []) as unknown as DailyRow[];
  const catchupRows = (catchupRes.data ?? []) as unknown as CatchupRow[];

  // ---- KPI aggregation ----
  let totalTarget = 0;
  let opvIssued = 0;
  let adminCoverage = 0;
  let missedChildren = 0;
  let refusals = 0;
  let teamsReported = 0;

  for (const r of dailyRows) {
    totalTarget += r.over_all_target ?? 0;
    opvIssued += r.opv_issued ?? 0;
    adminCoverage += r.admin_coverage ?? 0;
    missedChildren += r.missed_na_0_59 ?? 0;
    refusals += r.total_refusal ?? 0;
    teamsReported += r.teams_reported ?? 0;
  }
  for (const r of catchupRows) {
    opvIssued += r.opv_issued ?? 0;
    missedChildren += r.still_missed ?? 0;
    refusals += r.total_refusal ?? 0;
  }

  const coveragePct = safePct(adminCoverage, totalTarget);

  const kpis: DashboardKpis = {
    totalTarget,
    opvIssued,
    adminCoverage,
    coveragePct,
    missedChildren,
    refusals,
    teamsReported,
  };

  // ---- Day-by-day breakdown ----
  const dayMap = new Map<number, DayBreakdownRow>();
  for (let d = 1; d <= 4; d++) {
    dayMap.set(d, { day: d, opv: 0, missed: 0, refusals: 0, target: 0 });
  }

  for (const r of dailyRows) {
    const entry = dayMap.get(r.campaign_day);
    if (!entry) continue;
    entry.opv += r.opv_issued ?? 0;
    entry.missed += r.missed_na_0_59 ?? 0;
    entry.refusals += r.total_refusal ?? 0;
    entry.target += r.over_all_target ?? 0;
  }
  for (const r of catchupRows) {
    const entry = dayMap.get(4);
    if (!entry) continue;
    entry.opv += r.opv_issued ?? 0;
    entry.missed += r.still_missed ?? 0;
    entry.refusals += r.total_refusal ?? 0;
  }

  const dayBreakdown = Array.from(dayMap.values());

  // ---- UC breakdown ----
  const ucMap = new Map<string, UcBreakdownRow>();
  const key = (tehsil: string, uc: string) => `${tehsil}|||${uc}`;

  for (const r of dailyRows) {
    const k = key(r.tehsil, r.uc_name);
    let entry = ucMap.get(k);
    if (!entry) {
      entry = {
        uc: r.uc_name,
        tehsil: r.tehsil,
        opv: 0,
        adminCoverage: 0,
        target: 0,
        coveragePct: 0,
        missed: 0,
        refusals: 0,
        day: r.campaign_day,
      };
      ucMap.set(k, entry);
    }
    entry.opv += r.opv_issued ?? 0;
    entry.adminCoverage += r.admin_coverage ?? 0;
    entry.target += r.over_all_target ?? 0;
    entry.missed += r.missed_na_0_59 ?? 0;
    entry.refusals += r.total_refusal ?? 0;
    if (r.campaign_day > entry.day) entry.day = r.campaign_day;
  }
  for (const r of catchupRows) {
    const k = key(r.tehsil, r.uc_name);
    let entry = ucMap.get(k);
    if (!entry) {
      entry = {
        uc: r.uc_name,
        tehsil: r.tehsil,
        opv: 0,
        adminCoverage: 0,
        target: 0,
        coveragePct: 0,
        missed: 0,
        refusals: 0,
        day: 4,
      };
      ucMap.set(k, entry);
    }
    entry.opv += r.opv_issued ?? 0;
    entry.missed += r.still_missed ?? 0;
    entry.refusals += r.total_refusal ?? 0;
    entry.day = 4; // catchup overrides latest day
  }

  for (const entry of ucMap.values()) {
    entry.coveragePct = safePct(entry.adminCoverage, entry.target);
  }

  const ucBreakdown = Array.from(ucMap.values()).sort(
    (a, b) => b.coveragePct - a.coveragePct
  );

  // ---- Raw rows (limited to 100) ----
  const rows: DashboardRow[] = [
    ...dailyRows.map((r) => ({
      tehsil: r.tehsil,
      uc: r.uc_name,
      campaign_day: r.campaign_day,
      over_all_target: r.over_all_target ?? 0,
      opv_issued: r.opv_issued ?? 0,
      missed_na_0_59: r.missed_na_0_59 ?? 0,
      total_refusal: r.total_refusal ?? 0,
      teams_reported: r.teams_reported ?? 0,
    })),
    ...catchupRows.map((r) => ({
      tehsil: r.tehsil,
      uc: r.uc_name,
      campaign_day: 4,
      over_all_target: 0,
      opv_issued: r.opv_issued ?? 0,
      missed_na_0_59: r.still_missed ?? 0,
      total_refusal: r.total_refusal ?? 0,
      teams_reported: 0,
    })),
  ].slice(0, 100);

  return { kpis, dayBreakdown, ucBreakdown, rows };
}

/**
 * Fetch aggregated KPIs for a single campaign (used by campaign-comparison).
 * Returns the 6 KPIs across ALL days for the given campaign.
 */
export async function fetchCampaignKpis(
  supabase: ServerSupabaseClient,
  userId: string,
  campaignName: string
): Promise<DashboardKpis> {
  const data = await fetchDashboardData(supabase, userId, {
    campaign: campaignName,
    day: "all",
  });
  return data.kpis;
}
