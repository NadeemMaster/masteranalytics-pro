// ============================================================================
//  MasterAnalytics Pro — Dashboard Page (Server Component)
//  - Authenticates via requireUser()
//  - Fetches initial filter options + aggregated data server-side
//  - Renders an empty-state CTA if the user has no uploaded data
//  - Otherwise hands off to the DashboardClient for interactivity
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";

import { createClient, requireUser } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildFilterOptions,
  fetchDashboardData,
} from "@/lib/dashboard/aggregate";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // ---- Fetch identifier rows from both tables (for filter dropdowns) ----
  // NOTE: We use the server client so RLS sees the authenticated user.
  const supabase = await createClient();

  const IDENTIFIER_COLUMNS =
    "campaign_name, tehsil, uc_name, campaign_day";

  const [dailyRes, catchupRes] = await Promise.all([
    supabase
      .from("daily_campaign_data")
      .select(IDENTIFIER_COLUMNS)
      .eq("user_id", user.id),
    supabase
      .from("catchup_campaign_data")
      .select(IDENTIFIER_COLUMNS)
      .eq("user_id", user.id),
  ]);

  if (dailyRes.error) {
    console.error("[dashboard] daily identifier fetch error:", dailyRes.error);
  }
  if (catchupRes.error) {
    console.error("[dashboard] catchup identifier fetch error:", catchupRes.error);
  }

  const dailyIdentifiers = (dailyRes.data ?? []) as {
    campaign_name: string;
    tehsil: string;
    uc_name: string;
    campaign_day: number;
  }[];
  const catchupIdentifiers = (catchupRes.data ?? []) as {
    campaign_name: string;
    tehsil: string;
    uc_name: string;
    campaign_day: number;
  }[];

  const filterOptions = buildFilterOptions(dailyIdentifiers, catchupIdentifiers);

  const hasData = filterOptions.campaigns.length > 0;

  // ---- Fetch initial aggregated dashboard data (no filters) ----
  const initialData = hasData
    ? await fetchDashboardData(supabase, user.id, { day: "all" })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight text-slate-900">
              MasterAnalytics{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Pro
              </span>
            </span>
            <span className="ml-2 hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 sm:inline">
              Dashboard
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
            </Button>
            <UserMenu email={user.email} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Title row */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Campaign Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time coverage, missed-children &amp; refusal analytics for
              your polio immunization campaigns.
            </p>
          </div>
          {hasData ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Database className="h-3.5 w-3.5 text-green-500" />
              {filterOptions.campaigns.length} campaign
              {filterOptions.campaigns.length === 1 ? "" : "s"} •{" "}
              {Object.values(filterOptions.tehsilsByCampaign).flat().length}{" "}
              tehsils
            </div>
          ) : null}
        </div>

        {/* Empty state OR dashboard */}
        {!hasData || !initialData ? (
          <EmptyState email={user.email ?? "user"} />
        ) : (
          <DashboardClient
            email={user.email ?? "user"}
            filterOptions={filterOptions}
            initialData={initialData}
            initialFilters={{
              campaign: undefined,
              tehsil: undefined,
              uc: undefined,
              day: "all",
            }}
          />
        )}

        {/* Next-steps strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <NextStepCard
            icon={Upload}
            title="Upload more reports"
            desc="Days 1–3 are cumulative (latest replaces previous). Day 4 goes to catch-up."
            href="/upload"
            cta="Go to Upload"
            tone="blue"
          />
          <NextStepCard
            icon={BarChart3}
            title="Re-fetch dashboard"
            desc="Use the Reset button above to clear filters and view all your data."
            tone="slate"
          />
          <NextStepCard
            icon={Sparkles}
            title="AI Insights (coming soon)"
            desc="Step 7 will add Groq LLaMA-3 powered narrative insights on top of the charts."
            tone="amber"
            disabled
          />
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Empty State — shown when the user has not uploaded any data yet
// ---------------------------------------------------------------------------

function EmptyState({ email }: { email: string }) {
  return (
    <Card className="overflow-hidden border-blue-200">
      <CardHeader className="border-b border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">No campaign data yet</CardTitle>
            <CardDescription>
              Upload your first Day 1–4 Excel report to populate the dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              What you&apos;ll get
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  6 KPI cards: target, OPV, coverage %, missed, refusals,
                  teams.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  Cascading filters: campaign → tehsil → UC, plus per-day view.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  Recharts visualizations &amp; side-by-side campaign
                  comparison.
                </span>
              </li>
            </ul>
            <p className="pt-2 text-xs text-slate-500">
              Signed in as{" "}
              <span className="font-medium text-slate-700">{email}</span> — your
              data is isolated by Supabase Row-Level Security.
            </p>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:items-end">
            <Button asChild size="lg">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                Upload your first report
              </Link>
            </Button>
            <p className="text-xs text-slate-400 sm:text-right">
              Accepted: <code className="rounded bg-slate-100 px-1.5 py-0.5">.xlsx</code> files up to 10&nbsp;MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Next-step card
// ---------------------------------------------------------------------------

interface NextStepCardProps {
  icon: typeof Upload;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
  tone: "blue" | "slate" | "amber";
  disabled?: boolean;
}

function NextStepCard({
  icon: Icon,
  title,
  desc,
  href,
  cta,
  tone,
  disabled,
}: NextStepCardProps) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/50 text-blue-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/50 text-amber-700"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <Card className={toneClasses}>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <p className="flex-1 text-xs text-slate-600">{desc}</p>
        {href && cta ? (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={href}>{cta}</Link>
          </Button>
        ) : disabled ? (
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Coming soon
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
