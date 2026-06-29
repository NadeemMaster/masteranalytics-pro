"use client";

// ============================================================================
//  MasterAnalytics Pro — Dashboard Filter Bar
//  Cascading dropdowns: Campaign → Tehsil → UC, plus a Day selector.
//  Calls onApply(filters) when the user clicks "Apply Filters".
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { Filter, RotateCcw, Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DayFilter } from "@/lib/dashboard/aggregate";

export interface DashboardFilterValues {
  campaign?: string;
  tehsil?: string;
  uc?: string;
  day: DayFilter;
}

export interface FilterBarProps {
  filterOptions: {
    campaigns: string[];
    tehsilsByCampaign: Record<string, string[]>;
    ucsByCampaignTehsil: Record<string, Record<string, string[]>>;
  };
  initialFilters: DashboardFilterValues;
  onApply: (filters: DashboardFilterValues) => void;
  pending?: boolean;
}

const DAY_OPTIONS: { value: DayFilter; label: string }[] = [
  { value: "all", label: "All Days" },
  { value: "1", label: "Day 1" },
  { value: "2", label: "Day 2" },
  { value: "3", label: "Day 3" },
  { value: "4", label: "Day 4 (Catch-up)" },
];

export function FilterBar({
  filterOptions,
  initialFilters,
  onApply,
  pending,
}: FilterBarProps) {
  const [campaign, setCampaign] = useState<string>(initialFilters.campaign ?? "all");
  const [tehsil, setTehsil] = useState<string>(initialFilters.tehsil ?? "all");
  const [uc, setUc] = useState<string>(initialFilters.uc ?? "all");
  const [day, setDay] = useState<DayFilter>(initialFilters.day);
  const [, startTransition] = useTransition();

  const tehsils = useMemo(() => {
    if (campaign === "all") return [];
    return filterOptions.tehsilsByCampaign[campaign] ?? [];
  }, [campaign, filterOptions.tehsilsByCampaign]);

  const ucs = useMemo(() => {
    if (campaign === "all" || tehsil === "all") return [];
    return (
      filterOptions.ucsByCampaignTehsil[campaign]?.[tehsil] ?? []
    );
  }, [campaign, tehsil, filterOptions.ucsByCampaignTehsil]);

  function handleCampaignChange(value: string) {
    setCampaign(value);
    setTehsil("all");
    setUc("all");
  }

  function handleTehsilChange(value: string) {
    setTehsil(value);
    setUc("all");
  }

  function handleApply() {
    startTransition(() => {
      onApply({
        campaign: campaign === "all" ? undefined : campaign,
        tehsil: tehsil === "all" ? undefined : tehsil,
        uc: uc === "all" ? undefined : uc,
        day,
      });
    });
  }

  function handleReset() {
    setCampaign("all");
    setTehsil("all");
    setUc("all");
    setDay("all");
    startTransition(() => {
      onApply({
        campaign: undefined,
        tehsil: undefined,
        uc: undefined,
        day: "all",
      });
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Filter className="h-4 w-4 text-blue-600" />
        Filters
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Campaign */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-campaign" className="text-xs text-slate-600">
            Campaign
          </Label>
          <Select value={campaign} onValueChange={handleCampaignChange}>
            <SelectTrigger id="filter-campaign" className="bg-white">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {filterOptions.campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tehsil */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-tehsil" className="text-xs text-slate-600">
            Tehsil
          </Label>
          <Select
            value={tehsil}
            onValueChange={handleTehsilChange}
            disabled={campaign === "all"}
          >
            <SelectTrigger id="filter-tehsil" className="bg-white">
              <SelectValue placeholder="All tehsils" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tehsils</SelectItem>
              {tehsils.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UC */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-uc" className="text-xs text-slate-600">
            UC Name
          </Label>
          <Select
            value={uc}
            onValueChange={setUc}
            disabled={campaign === "all" || tehsil === "all"}
          >
            <SelectTrigger id="filter-uc" className="bg-white">
              <SelectValue placeholder="All UCs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All UCs</SelectItem>
              {ucs.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-day" className="text-xs text-slate-600">
            Campaign Day
          </Label>
          <Select value={day} onValueChange={(v) => setDay(v as DayFilter)}>
            <SelectTrigger id="filter-day" className="bg-white">
              <SelectValue placeholder="All days" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={handleApply} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Apply Filters
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={pending}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {(campaign !== "all" || tehsil !== "all" || uc !== "all" || day !== "all") && (
          <span className="text-xs text-slate-500">
            Filters active — click Apply to refresh data.
          </span>
        )}
      </div>
    </div>
  );
}
