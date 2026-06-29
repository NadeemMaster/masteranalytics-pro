"use client";

// ============================================================================
//  MasterAnalytics Pro — KPI Cards
//  6 KPI cards with icon, label, big formatted number, and a colour-coded
//  trend / context indicator.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import {
  Target,
  Droplet,
  Percent,
  AlertTriangle,
  Ban,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardKpis } from "@/lib/dashboard/aggregate";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  display?: string;
  hint?: string;
  tone: "blue" | "green" | "purple" | "amber" | "red" | "cyan";
  progress?: number; // 0-100, optional progress bar
}

const TONE_STYLES: Record<
  KpiCardProps["tone"],
  { iconBg: string; iconText: string; bar: string; ring: string }
> = {
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    bar: "bg-blue-500",
    ring: "ring-blue-100",
  },
  green: {
    iconBg: "bg-green-50",
    iconText: "text-green-600",
    bar: "bg-green-500",
    ring: "ring-green-100",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    bar: "bg-purple-500",
    ring: "ring-purple-100",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    bar: "bg-amber-500",
    ring: "ring-amber-100",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    bar: "bg-red-500",
    ring: "ring-red-100",
  },
  cyan: {
    iconBg: "bg-cyan-50",
    iconText: "text-cyan-600",
    bar: "bg-cyan-500",
    ring: "ring-cyan-100",
  },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  display,
  hint,
  tone,
  progress,
}: KpiCardProps) {
  const styles = TONE_STYLES[tone];
  return (
    <Card
      className={cn(
        "h-full overflow-hidden transition-shadow hover:shadow-md",
        "ring-1 ring-inset",
        styles.ring
      )}
    >
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums leading-tight tracking-tight text-slate-900 sm:text-2xl">
              {display ?? formatNumber(value)}
            </p>
            {hint ? (
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            ) : null}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              styles.iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", styles.iconText)} />
          </div>
        </div>
        {typeof progress === "number" ? (
          <div className="mt-auto pt-3">
            <Progress
              value={progress}
              indicatorClassName={styles.bar}
              className="h-1.5"
            />
            <p className="mt-1 text-right text-[10px] font-medium text-slate-400">
              {progress.toFixed(1)}%
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface KpiCardsProps {
  kpis: DashboardKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const coverage = kpis.coveragePct;
  const coverageTone: KpiCardProps["tone"] =
    coverage >= 95
      ? "green"
      : coverage >= 80
        ? "blue"
        : coverage >= 60
          ? "amber"
          : "red";

  const refusalTone: KpiCardProps["tone"] =
    kpis.refusals === 0 ? "green" : kpis.refusals < 50 ? "amber" : "red";

  const missedTone: KpiCardProps["tone"] =
    kpis.missedChildren === 0
      ? "green"
      : kpis.missedChildren < 100
        ? "amber"
        : "red";

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={Target}
        label="Total Target"
        value={kpis.totalTarget}
        tone="blue"
        hint="Children targeted"
      />
      <KpiCard
        icon={Droplet}
        label="Admin Coverage"
        value={kpis.adminCoverage}
        tone="cyan"
        hint="Children vaccinated"
      />
      <KpiCard
        icon={Percent}
        label="Admin Coverage %"
        value={coverage}
        display={`${coverage.toFixed(1)}%`}
        tone={coverageTone}
        progress={coverage}
        hint="Admin coverage / Target × 100"
      />
      <KpiCard
        icon={AlertTriangle}
        label="Missed Children"
        value={kpis.missedChildren}
        tone={missedTone}
        hint="Still missed"
      />
      <KpiCard
        icon={Ban}
        label="Refusals"
        value={kpis.refusals}
        tone={refusalTone}
        hint="Total refusals"
      />
      <KpiCard
        icon={Users}
        label="Teams Reported"
        value={kpis.teamsReported}
        tone="purple"
        hint="Reporting teams"
      />
    </div>
  );
}

// ---- Skeleton (shown while loading) ----

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
            </div>
            <div className="mt-3 h-1.5 w-full animate-pulse rounded bg-slate-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
