"use client";

// ============================================================================
//  MasterAnalytics Pro — Dashboard Client Orchestrator
//  Holds the current filter state, fetches aggregated data on filter change,
//  and renders FilterBar + KpiCards + Charts + Campaign Comparison.
//
//  The initial data is provided by the Server Component (server-rendered)
//  so the first paint is instant; subsequent filter changes go through the
//  /api/dashboard-data endpoint.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useCallback, useState, useTransition } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { FilterBar, type DashboardFilterValues } from "@/components/dashboard/filter-bar";
import {
  KpiCards,
  KpiCardsSkeleton,
} from "@/components/dashboard/kpi-cards";
import {
  ChartsSkeleton,
  CoverageVsTargetChart,
  DayByDayChart,
  UcCoverageChart,
} from "@/components/dashboard/charts";
import { UcPerformanceMatrix } from "@/components/dashboard/uc-performance-matrix";
import { CampaignComparison } from "@/components/dashboard/campaign-comparison";
import { AiInsightsCard } from "@/components/dashboard/ai-insights";
import { PdfReportButton } from "@/components/dashboard/pdf-report-button";
import { EditableTable } from "@/components/dashboard/editable-table";
import { ChatWidget } from "@/components/dashboard/chat-widget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  DashboardData,
  FilterOptions,
} from "@/lib/dashboard/aggregate";

export interface DashboardClientProps {
  email: string;
  filterOptions: FilterOptions;
  initialData: DashboardData;
  initialFilters: DashboardFilterValues;
}

export function DashboardClient({
  email,
  filterOptions,
  initialData,
  initialFilters,
}: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [filters, setFilters] = useState<DashboardFilterValues>(initialFilters);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(
    async (nextFilters: DashboardFilterValues) => {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (nextFilters.campaign) params.set("campaign", nextFilters.campaign);
        if (nextFilters.tehsil) params.set("tehsil", nextFilters.tehsil);
        if (nextFilters.uc) params.set("uc", nextFilters.uc);
        params.set("day", nextFilters.day);

        const res = await fetch(`/api/dashboard-data?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed (${res.status})`);
        }
        const body = (await res.json()) as DashboardData;
        setData(body);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data."
        );
      }
    },
    []
  );

  const handleApply = useCallback(
    (next: DashboardFilterValues) => {
      setFilters(next);
      startTransition(() => {
        void fetchFilters(next);
      });
    },
    [fetchFilters]
  );

  // Called by <EditableTable /> after a successful row update so the
  // dashboard KPIs / charts reflect the new database values.
  const handleDataUpdated = useCallback(() => {
    void fetchFilters(filters);
  }, [fetchFilters, filters]);

  const activeFilterCount =
    (filters.campaign ? 1 : 0) +
    (filters.tehsil ? 1 : 0) +
    (filters.uc ? 1 : 0) +
    (filters.day !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        onApply={handleApply}
        pending={pending}
      />

      {/* Active filter chips */}
      {activeFilterCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Active filters:</span>
          {filters.campaign ? (
            <Badge variant="info">Campaign: {filters.campaign}</Badge>
          ) : null}
          {filters.tehsil ? (
            <Badge variant="info">Tehsil: {filters.tehsil}</Badge>
          ) : null}
          {filters.uc ? (
            <Badge variant="info">UC: {filters.uc}</Badge>
          ) : null}
          {filters.day !== "all" ? (
            <Badge variant="info">
              Day: {filters.day === "4" ? "4 (Catch-up)" : filters.day}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {/* Error banner */}
      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn&apos;t refresh dashboard data.</p>
            <p className="text-red-600">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleApply(filters)}
            disabled={pending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : null}

      {/* KPI cards (or skeleton during transition) */}
      {pending ? <KpiCardsSkeleton /> : <KpiCards kpis={data.kpis} />}

      {/* Charts */}
      {pending ? (
        <ChartsSkeleton />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DayByDayChart data={data.dayBreakdown} />
          <UcCoverageChart data={data.ucBreakdown} limit={10} />
        </div>
      )}

      {pending ? (
        <ChartsSkeleton />
      ) : (
        <CoverageVsTargetChart data={data.ucBreakdown} limit={10} />
      )}

      {/* UC Performance Matrix — all 6 metrics per UC (color-coded, sortable, filterable) */}
      {pending ? (
        <ChartsSkeleton />
      ) : (
        <UcPerformanceMatrix data={data.ucBreakdown} />
      )}

      {/* AI Insights (Groq LLaMA-3) + PDF Export */}
      {!pending ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                AI Analysis &amp; Report
              </h3>
              <p className="text-sm text-slate-500">
                Generate AI insights or export a full PDF analysis report.
              </p>
            </div>
            <PdfReportButton
              campaign={filters.campaign || ""}
              tehsil={filters.tehsil || undefined}
              ucName={filters.uc || undefined}
              day={filters.day === "all" ? "all" : (parseInt(filters.day, 10) as 1 | 2 | 3 | 4)}
            />
          </div>
          <AiInsightsCard
            campaign={filters.campaign || ""}
            tehsil={filters.tehsil || undefined}
            ucName={filters.uc || undefined}
            day={filters.day === "all" ? "all" : (parseInt(filters.day, 10) as 1 | 2 | 3 | 4)}
          />
        </div>
      ) : null}

      {/* Editable data table (Excel-like layout with per-row edit/save) */}
      {!pending ? (
        <EditableTable
          campaign={filters.campaign || undefined}
          tehsil={filters.tehsil || undefined}
          uc={filters.uc || undefined}
          day={filters.day}
          onDataUpdated={handleDataUpdated}
        />
      ) : null}

      {/* Campaign Comparison */}
      <CampaignComparison campaigns={filterOptions.campaigns} />

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400">
        Signed in as <span className="font-medium text-slate-500">{email}</span> —
        dashboard data is scoped to your account via Supabase RLS.
      </p>

      {/* Floating AI Chatbot */}
      <ChatWidget
        campaign={filters.campaign || undefined}
        tehsil={filters.tehsil || undefined}
        uc={filters.uc || undefined}
        day={filters.day}
        userName={email}
      />
    </div>
  );
}
