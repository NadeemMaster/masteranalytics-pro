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
import { CampaignComparison } from "@/components/dashboard/campaign-comparison";
import { AiInsightsCard } from "@/components/dashboard/ai-insights";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
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

      {/* AI Insights (Groq LLaMA-3) */}
      {!pending ? (
        <AiInsightsCard
          campaign={filters.campaign || ""}
          tehsil={filters.tehsil || undefined}
          ucName={filters.uc || undefined}
          day={filters.day === "all" ? "all" : (parseInt(filters.day, 10) as 1 | 2 | 3 | 4)}
        />
      ) : null}

      {/* Raw rows table */}
      {!pending ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Raw Rows (latest 100)</CardTitle>
              <Badge variant="secondary">{data.rows.length} rows</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No rows match the current filters.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Tehsil</TableHead>
                      <TableHead>UC</TableHead>
                      <TableHead className="text-center">Day</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">OPV</TableHead>
                      <TableHead className="text-right">Missed</TableHead>
                      <TableHead className="text-right">Refusals</TableHead>
                      <TableHead className="text-right">Teams</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, i) => (
                      <TableRow key={`${row.tehsil}-${row.uc}-${row.campaign_day}-${i}`}>
                        <TableCell className="font-medium text-slate-700">
                          {row.tehsil}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {row.uc}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={row.campaign_day === 4 ? "warning" : "outline"}
                            className="font-mono text-[10px]"
                          >
                            D{row.campaign_day}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">
                          {formatNumber(row.over_all_target)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-slate-800">
                          {formatNumber(row.opv_given)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-700">
                          {formatNumber(row.missed_na_0_59)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">
                          {formatNumber(row.total_refusal)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">
                          {formatNumber(row.teams_reported)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Campaign Comparison */}
      <CampaignComparison campaigns={filterOptions.campaigns} />

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400">
        Signed in as <span className="font-medium text-slate-500">{email}</span> —
        dashboard data is scoped to your account via Supabase RLS.
      </p>
    </div>
  );
}
