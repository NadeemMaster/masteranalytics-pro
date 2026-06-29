"use client";

// ============================================================================
//  MasterAnalytics Pro — Campaign Comparison
//  Side-by-side comparison of two campaigns (current vs previous).
//  Shows: Total Target, OPV Issued, Admin Coverage %, Missed Children, Refusals,
//  Teams Reported — each with variance & variance %.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useEffect, useState } from "react";
import { ArrowRight, GitCompare, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardKpis } from "@/lib/dashboard/aggregate";

interface CampaignComparisonProps {
  campaigns: string[];
}

interface ComparisonResponse {
  current: { campaign: string; kpis: DashboardKpis };
  previous: { campaign: string; kpis: DashboardKpis };
}

interface MetricRow {
  label: string;
  current: number;
  previous: number;
  format: "number" | "percent";
  // For "percent" metrics, higher is better. For others, configurable.
  higherIsBetter: boolean;
}

function buildMetricRows(current: DashboardKpis, previous: DashboardKpis): MetricRow[] {
  return [
    {
      label: "Total Target",
      current: current.totalTarget,
      previous: previous.totalTarget,
      format: "number",
      higherIsBetter: false, // smaller target = fewer children to reach (good)
    },
    {
      label: "OPV Issued",
      current: current.opvIssued,
      previous: previous.opvIssued,
      format: "number",
      higherIsBetter: true,
    },
    {
      label: "Admin Coverage %",
      current: current.coveragePct,
      previous: previous.coveragePct,
      format: "percent",
      higherIsBetter: true,
    },
    {
      label: "Missed Children",
      current: current.missedChildren,
      previous: previous.missedChildren,
      format: "number",
      higherIsBetter: false,
    },
    {
      label: "Refusals",
      current: current.refusals,
      previous: previous.refusals,
      format: "number",
      higherIsBetter: false,
    },
    {
      label: "Teams Reported",
      current: current.teamsReported,
      previous: previous.teamsReported,
      format: "number",
      higherIsBetter: true,
    },
  ];
}

function formatMetric(value: number, format: MetricRow["format"]): string {
  if (format === "percent") return `${value.toFixed(1)}%`;
  return formatNumber(value);
}

function computeVariance(row: MetricRow): {
  diff: number;
  pct: number;
  isImprovement: boolean;
} {
  const diff = row.current - row.previous;
  const pct = row.previous !== 0 ? (diff / Math.abs(row.previous)) * 100 : 0;
  // An "improvement" means the change is in the desired direction.
  // - If higherIsBetter and diff > 0 → improvement
  // - If !higherIsBetter and diff < 0 → improvement (fewer missed/refusals/target)
  // - diff === 0 → neutral (we treat as improvement=false to avoid showing an arrow)
  let isImprovement = false;
  if (diff === 0) isImprovement = false;
  else if (row.higherIsBetter) isImprovement = diff > 0;
  else isImprovement = diff < 0;
  return { diff, pct, isImprovement };
}

export function CampaignComparison({ campaigns }: CampaignComparisonProps) {
  const [current, setCurrent] = useState<string>(campaigns[0] ?? "");
  const [previous, setPrevious] = useState<string>(campaigns[1] ?? "");
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Make sure defaults are valid once campaigns arrive.
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.includes(current)) setCurrent(campaigns[0] ?? "");
    if (!campaigns.includes(previous)) {
      setPrevious(campaigns[1] ?? campaigns[0] ?? "");
    }
    // We intentionally only run when the campaigns list reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  async function handleCompare() {
    if (!current || !previous) {
      setError("Please select both campaigns to compare.");
      return;
    }
    if (current === previous) {
      setError("Please pick two different campaigns.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        current,
        previous,
      });
      const res = await fetch(`/api/campaign-comparison?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const body = (await res.json()) as ComparisonResponse;
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison.");
    } finally {
      setLoading(false);
    }
  }

  const rows = data ? buildMetricRows(data.current.kpis, data.previous.kpis) : [];

  const hasEnoughCampaigns = campaigns.length >= 2;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompare className="h-4 w-4 text-blue-600" />
              Campaign Comparison
            </CardTitle>
            <CardDescription>
              Side-by-side comparison of two campaigns
            </CardDescription>
          </div>
          {data ? (
            <Badge variant="info" className="self-start sm:self-auto">
              {data.current.campaign} → {data.previous.campaign}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasEnoughCampaigns ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
            You need at least <strong>2 campaigns</strong> of uploaded data to
            use the comparison tool. Upload more reports to enable this view.
          </div>
        ) : (
          <>
            {/* Pickers */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="cmp-current" className="text-xs text-slate-600">
                  Current Campaign
                </Label>
                <Select value={current} onValueChange={setCurrent}>
                  <SelectTrigger id="cmp-current" className="bg-white">
                    <SelectValue placeholder="Select current" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cmp-previous" className="text-xs text-slate-600">
                  Previous Campaign
                </Label>
                <Select value={previous} onValueChange={setPrevious}>
                  <SelectTrigger id="cmp-previous" className="bg-white">
                    <SelectValue placeholder="Select previous" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCompare} disabled={loading} className="lg:w-auto">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitCompare className="h-4 w-4" />
                )}
                Compare
              </Button>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* Results table */}
            {data ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-1/3">Metric</TableHead>
                      <TableHead className="text-right">
                        Current
                        <div className="text-xs font-normal text-slate-500">
                          {data.current.campaign}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        Previous
                        <div className="text-xs font-normal text-slate-500">
                          {data.previous.campaign}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const { diff, pct, isImprovement } = computeVariance(row);
                      const isNeutral = diff === 0;
                      return (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium text-slate-700">
                            {row.label}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMetric(row.current, row.format)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-slate-500">
                            {formatMetric(row.previous, row.format)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 tabular-nums font-medium",
                                isNeutral
                                  ? "text-slate-400"
                                  : isImprovement
                                    ? "text-green-600"
                                    : "text-red-600"
                              )}
                            >
                              {isNeutral ? null : isImprovement ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                              {diff > 0 ? "+" : ""}
                              {row.format === "percent"
                                ? `${diff.toFixed(1)}pp`
                                : formatNumber(diff)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={cn(
                                "font-medium",
                                isNeutral
                                  ? "text-slate-400"
                                  : isImprovement
                                    ? "text-green-600"
                                    : "text-red-600"
                              )}
                            >
                              {pct > 0 ? "+" : ""}
                              {pct.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                <ArrowRight className="h-6 w-6 text-slate-400" />
                Select two campaigns above and click <strong>Compare</strong> to
                see the side-by-side breakdown.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
