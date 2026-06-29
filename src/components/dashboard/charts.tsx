"use client";

// ============================================================================
//  MasterAnalytics Pro — Dashboard Charts (Recharts)
//  1) Day-by-Day Progress — Bar chart (OPV, missed, refusals across Days 1-4)
//  2) UC-wise Comparison — Horizontal bar chart (coverage % per UC)
//  3) Coverage vs Target — Composed/area chart (target vs OPV per UC)
//
//  Uses shadcn chart CSS variables (--chart-1 .. --chart-5).
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ReferenceLine,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type {
  DayBreakdownRow,
  UcBreakdownRow,
} from "@/lib/dashboard/aggregate";

// ---- chart palette (matches globals.css) ----
const CHART = {
  c1: "hsl(221.2 83.2% 53.3%)", // blue
  c2: "hsl(142.1 76.2% 36.3%)", // green
  c3: "hsl(24.6 95% 53.1%)", // orange
  c4: "hsl(280 65% 60%)", // purple
  c5: "hsl(340 75% 55%)", // pink
};

function coverageColor(pct: number): string {
  if (pct >= 95) return CHART.c2;
  if (pct >= 80) return CHART.c1;
  if (pct >= 60) return CHART.c3;
  return CHART.c5;
}

// ---- Tooltip formatters ----

const tooltipStyle = {
  backgroundColor: "rgba(255,255,255,0.97)",
  border: "1px solid hsl(214.3 31.8% 91.4%)",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

function formatTooltipValue(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return formatNumber(n);
}

// ---------------------------------------------------------------------------
//  1) Day-by-Day Progress
// ---------------------------------------------------------------------------

interface DayByDayChartProps {
  data: DayBreakdownRow[];
}

export function DayByDayChart({ data }: DayByDayChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        day: `Day ${d.day}`,
        opv: d.opv,
        missed: d.missed,
        refusals: d.refusals,
        target: d.target,
      })),
    [data]
  );

  const isEmpty = data.every((d) => d.opv === 0 && d.missed === 0 && d.refusals === 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Day-by-Day Progress</CardTitle>
            <CardDescription>
              OPV issued, missed children &amp; refusals across campaign days
            </CardDescription>
          </div>
          <Badge variant="info">4 days</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No data for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [formatTooltipValue(value as number), name as string]}
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="opv" name="OPV Issued" fill={CHART.c1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed" name="Missed" fill={CHART.c3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="refusals" name="Refusals" fill={CHART.c5} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  2) UC-wise Comparison (Horizontal bar — coverage %)
// ---------------------------------------------------------------------------

interface UcCoverageChartProps {
  data: UcBreakdownRow[];
  /** how many top/bottom UCs to show */
  limit?: number;
}

export function UcCoverageChart({ data, limit = 10 }: UcCoverageChartProps) {
  const chartData = useMemo(() => {
    // sort by coverage ascending so the worst performers are at the top
    const sorted = [...data].sort((a, b) => a.coveragePct - b.coveragePct);
    return sorted.slice(0, limit).map((u) => ({
      uc: u.uc.length > 18 ? `${u.uc.slice(0, 16)}…` : u.uc,
      fullName: u.uc,
      tehsil: u.tehsil,
      coverage: Number(u.coveragePct.toFixed(2)),
      opv: u.opv,
      target: u.target,
    }));
  }, [data, limit]);

  const isEmpty = chartData.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">UC-wise Admin Coverage %</CardTitle>
            <CardDescription>
              Bottom {limit} UCs by coverage (lowest first)
            </CardDescription>
          </div>
          <Badge variant="warning">Low performers</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No UC-level data for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 36)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="uc"
                tick={{ fontSize: 11, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, _name, item) => {
                  const payload = (item as { payload?: { fullName?: string; tehsil?: string; opv?: number; target?: number } }).payload;
                  const label = payload?.fullName ? `${payload.fullName} (${payload.tehsil ?? ""})` : "";
                  return [`${Number(value).toFixed(1)}% coverage`, label];
                }}
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <ReferenceLine x={95} stroke={CHART.c2} strokeDasharray="4 4" />
              <ReferenceLine x={80} stroke={CHART.c1} strokeDasharray="4 4" />
              <Bar dataKey="coverage" name="Coverage %" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={coverageColor(entry.coverage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  3) Coverage vs Target (Composed: bars = target & opv, line = coverage %)
// ---------------------------------------------------------------------------

interface CoverageVsTargetChartProps {
  data: UcBreakdownRow[];
  /** how many top UCs (by target) to show */
  limit?: number;
}

export function CoverageVsTargetChart({ data, limit = 10 }: CoverageVsTargetChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.target - a.target);
    return sorted.slice(0, limit).map((u) => ({
      uc: u.uc.length > 14 ? `${u.uc.slice(0, 12)}…` : u.uc,
      fullName: u.uc,
      target: u.target,
      opv: u.opv,
      coverage: Number(u.coveragePct.toFixed(2)),
    }));
  }, [data, limit]);

  const isEmpty = chartData.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Admin Coverage vs Target (top UCs)</CardTitle>
            <CardDescription>
              Target vs OPV with admin coverage % overlay
            </CardDescription>
          </div>
          <Badge variant="info">Top {limit}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No UC-level data for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="uc"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  const label = name === "Coverage %" ? `${Number(value).toFixed(1)}%` : formatTooltipValue(value as number);
                  return [label, name as string];
                }}
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <defs>
                <linearGradient id="opvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.c1} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={CHART.c1} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <Bar yAxisId="left" dataKey="target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="opv"
                name="OPV Issued"
                stroke={CHART.c1}
                fill="url(#opvGradient)"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="coverage"
                name="Admin Coverage %"
                stroke={CHART.c4}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.c4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Skeletons
// ---------------------------------------------------------------------------

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-1 h-3 w-56 animate-pulse rounded bg-slate-100" />
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full animate-pulse rounded bg-slate-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
