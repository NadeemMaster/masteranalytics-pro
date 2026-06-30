"use client";

// ============================================================================
//  MasterAnalytics Pro — UC Performance Matrix
//  A color-coded, sortable, filterable table showing all 6 metrics per UC.
//  Scales to any number of UCs (pagination) — replaces a bar chart that would
//  be unreadable for 50+ UCs.
//
//  Color thresholds:
//   - Coverage %:        green ≥95, blue ≥80, amber ≥60, red <60
//   - NA Recorded:       relative to target — green low, amber medium, red high
//   - Refusals Recorded: relative to target — green low, amber medium, red high
//   - NA Covered Same Day: recovery rate (covered/recorded) — green high, amber medium, red low
//   - Refusals Covered:    recovery rate (covered/recorded) — green high, amber medium, red low
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatNumber } from "@/lib/utils";
import type { UcBreakdownRow } from "@/lib/dashboard/aggregate";

// ---- types ----------------------------------------------------------------

type SortKey =
  | "uc"
  | "tehsil"
  | "target"
  | "adminCoverage"
  | "coveragePct"
  | "naRecorded"
  | "naCoveredSameDay"
  | "refusalsRecorded"
  | "refusalsCovered";

type SortDir = "asc" | "desc";

interface UcPerformanceMatrixProps {
  data: UcBreakdownRow[];
  /** rows per page */
  pageSize?: number;
}

// ---- color helpers --------------------------------------------------------
// Returns a tailwind bg/text class pair based on a 0-100 percentage.

type CellTone = "good" | "moderate" | "warn" | "critical" | "neutral";

const TONE_CLASSES: Record<CellTone, string> = {
  good: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  moderate: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  neutral: "text-slate-600 dark:text-slate-300",
};

/** Coverage % tone: green ≥95, blue ≥80, amber ≥60, red <60 */
function coverageTone(pct: number): CellTone {
  if (pct >= 95) return "good";
  if (pct >= 80) return "moderate";
  if (pct >= 60) return "warn";
  return "critical";
}

/**
 * Tone for "recorded" counts (NA Recorded, Refusals Recorded) relative to target.
 * ratio = recorded / target  (0 = none, 1 = as many recorded as the entire target)
 *  - <3%  → good (few missed/refusals)
 *  - <8%  → moderate
 *  - <15% → warn
 *  - ≥15% → critical
 */
function recordedTone(recorded: number, target: number): CellTone {
  if (target <= 0) return recorded === 0 ? "good" : "warn";
  const ratio = recorded / target;
  if (ratio < 0.03) return "good";
  if (ratio < 0.08) return "moderate";
  if (ratio < 0.15) return "warn";
  return "critical";
}

/**
 * Tone for "covered" counts (NA Covered Same Day, Refusals Covered).
 * recovery = covered / recorded  (1 = 100% recovered, 0 = none recovered)
 *  - ≥80% → good
 *  - ≥50% → moderate
 *  - ≥20% → warn
 *  - <20% → critical
 *  If nothing was recorded, neutral (no recovery needed).
 */
function recoveryTone(covered: number, recorded: number): CellTone {
  if (recorded <= 0) return "neutral";
  const rate = covered / recorded;
  if (rate >= 0.8) return "good";
  if (rate >= 0.5) return "moderate";
  if (rate >= 0.2) return "warn";
  return "critical";
}

// ---- column config --------------------------------------------------------

interface ColumnDef {
  key: SortKey;
  label: string;
  sublabel?: string;
  align: "left" | "right";
  /** returns the numeric/string value used for sorting */
  sortValue: (u: UcBreakdownRow) => number | string;
  /** renders the cell content + tone */
  render: (u: UcBreakdownRow) => { text: string; tone: CellTone };
}

const COLUMNS: ColumnDef[] = [
  {
    key: "uc",
    label: "UC",
    align: "left",
    sortValue: (u) => u.uc,
    render: (u) => ({ text: u.uc, tone: "neutral" }),
  },
  {
    key: "tehsil",
    label: "Tehsil",
    align: "left",
    sortValue: (u) => u.tehsil,
    render: (u) => ({ text: u.tehsil, tone: "neutral" }),
  },
  {
    key: "target",
    label: "Target",
    align: "right",
    sortValue: (u) => u.target,
    render: (u) => ({ text: formatNumber(u.target), tone: "neutral" }),
  },
  {
    key: "adminCoverage",
    label: "Admin Cov",
    align: "right",
    sortValue: (u) => u.adminCoverage,
    render: (u) => ({ text: formatNumber(u.adminCoverage), tone: "neutral" }),
  },
  {
    key: "coveragePct",
    label: "Cov %",
    align: "right",
    sortValue: (u) => u.coveragePct,
    render: (u) => ({
      text: `${u.coveragePct.toFixed(1)}%`,
      tone: coverageTone(u.coveragePct),
    }),
  },
  {
    key: "naRecorded",
    label: "NA Rec",
    align: "right",
    sortValue: (u) => u.naRecorded,
    render: (u) => ({
      text: formatNumber(u.naRecorded),
      tone: recordedTone(u.naRecorded, u.target),
    }),
  },
  {
    key: "naCoveredSameDay",
    label: "NA Cov",
    sublabel: "same-day",
    align: "right",
    sortValue: (u) => u.naCoveredSameDay,
    render: (u) => ({
      text: formatNumber(u.naCoveredSameDay),
      tone: recoveryTone(u.naCoveredSameDay, u.naRecorded),
    }),
  },
  {
    key: "refusalsRecorded",
    label: "Ref Rec",
    align: "right",
    sortValue: (u) => u.refusalsRecorded,
    render: (u) => ({
      text: formatNumber(u.refusalsRecorded),
      tone: recordedTone(u.refusalsRecorded, u.target),
    }),
  },
  {
    key: "refusalsCovered",
    label: "Ref Cov",
    sublabel: "proxy",
    align: "right",
    sortValue: (u) => u.refusalsCovered,
    render: (u) => ({
      text: formatNumber(u.refusalsCovered),
      tone: recoveryTone(u.refusalsCovered, u.refusalsRecorded),
    }),
  },
];

// ---- component ------------------------------------------------------------

export function UcPerformanceMatrix({
  data,
  pageSize = 12,
}: UcPerformanceMatrixProps) {
  const [search, setSearch] = useState("");
  const [tehsilFilter, setTehsilFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("coveragePct");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  // unique tehsils for the filter dropdown
  const tehsils = useMemo(() => {
    const set = new Set<string>();
    data.forEach((u) => set.add(u.tehsil));
    return Array.from(set).sort();
  }, [data]);

  // filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((u) => {
      if (tehsilFilter !== "all" && u.tehsil !== tehsilFilter) return false;
      if (q && !u.uc.toLowerCase().includes(q) && !u.tehsil.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, search, tehsilFilter]);

  // sort
  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey)!;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * dir;
      }
      return (va - vb) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = useMemo(
    () => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [sorted, safePage, pageSize]
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const isEmpty = data.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">UC Performance Matrix</CardTitle>
            <CardDescription>
              All 6 metrics per UC — click a column header to sort
            </CardDescription>
          </div>
          <Badge variant="info">{data.length} UCs</Badge>
        </div>

        {/* Controls */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search UC or tehsil…"
              className="pl-8"
            />
          </div>
          <Select
            value={tehsilFilter}
            onValueChange={(v) => {
              setTehsilFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
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
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No UC-level data for the selected filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    {COLUMNS.map((col) => {
                      const isActive = col.key === sortKey;
                      return (
                        <TableHead
                          key={col.key}
                          className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100 ${
                            col.align === "right" ? "text-right" : "text-left"
                          } ${isActive ? "text-slate-900" : ""}`}
                          onClick={() => toggleSort(col.key)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <span>
                              {col.label}
                              {col.sublabel && (
                                <span className="block text-[10px] font-normal normal-case text-slate-400">
                                  {col.sublabel}
                                </span>
                              )}
                            </span>
                            {isActive &&
                              (sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              ))}
                          </span>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((u) => (
                    <TableRow key={`${u.uc}-${u.tehsil}`} className="text-xs">
                      {COLUMNS.map((col) => {
                        const { text, tone } = col.render(u);
                        return (
                          <TableCell
                            key={col.key}
                            className={`whitespace-nowrap px-2 py-1.5 ${
                              col.align === "right" ? "text-right tabular-nums" : "text-left"
                            } ${TONE_CLASSES[tone]}`}
                          >
                            {text}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={COLUMNS.length}
                        className="py-8 text-center text-sm text-slate-400"
                      >
                        No UCs match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {sorted.length === 0 ? 0 : safePage * pageSize + 1}–
                  {Math.min((safePage + 1) * pageSize, sorted.length)}
                </span>{" "}
                of <span className="font-medium text-slate-700">{sorted.length}</span> UCs
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="px-2">
                  Page {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">Color scale:</span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200" /> Good
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" /> Moderate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" /> Warn
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" /> Critical
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
