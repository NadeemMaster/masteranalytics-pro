"use client";

// ============================================================================
//  MasterAnalytics Pro — Editable Data Table (Excel-like layout)
//  Renders campaign rows in a horizontally-scrollable table that mirrors the
//  original Excel file layout. Each row has an edit (✏️) button that toggles
//  all fields to editable inputs; the button changes to save (✓) + cancel (✕).
//  On save, PATCH /api/rows updates the database, then the dashboard refreshes.
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sheet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import { getColumns, type ColumnDef } from "@/lib/dashboard/columns";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type RowData = Record<string, unknown>;

interface EditableTableProps {
  campaign?: string;
  tehsil?: string;
  uc?: string;
  day: string;
  /** Called after a successful row update so the dashboard can refresh. */
  onDataUpdated?: () => void;
}

interface GroupSpan {
  group: string;
  count: number;
  frozen: boolean;
}

// ---------------------------------------------------------------------------
//  Frozen column layout constants
//  Frozen columns are sticky-left so they stay visible during horizontal scroll.
// ---------------------------------------------------------------------------

const FROZEN_WIDTHS: Record<string, number> = {
  tehsil: 140,
  uc_name: 140,
  campaign_day: 80,
};
const ACTIONS_WIDTH = 120;

/** Compute the sticky `left` offset for a frozen column. */
function frozenLeftOffset(col: ColumnDef, columns: ColumnDef[]): number {
  let offset = 0;
  for (const c of columns) {
    if (c === col) break;
    if (c.frozen) {
      offset += FROZEN_WIDTHS[c.key] ?? 140;
    }
  }
  return offset;
}

/** Get the fixed width for a frozen column. */
function frozenWidth(col: ColumnDef): number {
  return FROZEN_WIDTHS[col.key] ?? 140;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Compute colspan for each column group (consecutive columns with same group). */
function computeGroupSpans(columns: ColumnDef[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  for (const col of columns) {
    const last = spans[spans.length - 1];
    if (last && last.group === col.group) {
      last.count++;
    } else {
      spans.push({ group: col.group, count: 1, frozen: !!col.frozen });
    }
  }
  return spans;
}

/** Format a cell value for display based on its column type. */
function displayValue(col: ColumnDef, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (col.type === "string") return String(value);
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return "—";
  if (col.type === "percent") return `${num.toFixed(1)}%`;
  return formatNumber(num);
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export function EditableTable({
  campaign,
  tehsil,
  uc,
  day,
  onDataUpdated,
}: EditableTableProps) {
  // ---- Determine table type from day filter ----
  const defaultTable: "daily" | "catchup" = day === "4" ? "catchup" : "daily";
  const [tableType, setTableType] = useState<"daily" | "catchup">(defaultTable);
  const [showToggle, setShowToggle] = useState(day === "all");

  useEffect(() => {
    if (day === "4") {
      setTableType("catchup");
      setShowToggle(false);
    } else if (day !== "all") {
      setTableType("daily");
      setShowToggle(false);
    } else {
      setShowToggle(true);
    }
  }, [day]);

  const columns = useMemo(() => getColumns(tableType), [tableType]);
  const groupSpans = useMemo(() => computeGroupSpans(columns), [columns]);

  // ---- State ----
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ---- Fetch rows from /api/rows ----
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEditingId(null);
    try {
      const params = new URLSearchParams();
      params.set("table", tableType);
      if (campaign) params.set("campaign", campaign);
      if (tehsil) params.set("tehsil", tehsil);
      if (uc) params.set("uc", uc);
      if (day !== "all") params.set("day", day);

      const res = await fetch(`/api/rows?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const body = (await res.json()) as { rows: RowData[]; total: number };
      setRows(body.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rows.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tableType, campaign, tehsil, uc, day]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  // ---- Edit handlers ----

  const startEdit = useCallback(
    (row: RowData) => {
      const id = String(row.id ?? "");
      const d: Record<string, string> = {};
      for (const col of columns) {
        const val = row[col.key];
        d[col.key] = val === null || val === undefined ? "" : String(val);
      }
      setDraft(d);
      setEditingId(id);
    },
    [columns]
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft({});
  }, []);

  const updateDraft = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveRow = useCallback(
    async (row: RowData) => {
      const id = String(row.id ?? "");
      if (!id) {
        toast.error("Cannot save", { description: "Row has no ID." });
        return;
      }

      // Compute only changed fields
      const changes: Record<string, unknown> = {};
      for (const col of columns) {
        if (!col.editable) continue;
        const original =
          row[col.key] === null || row[col.key] === undefined
            ? ""
            : String(row[col.key]);
        if (draft[col.key] !== original) {
          changes[col.key] = draft[col.key];
        }
      }

      if (Object.keys(changes).length === 0) {
        setEditingId(null);
        toast.info("No changes to save.");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/rows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: tableType, id, changes }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          throw new Error(body?.error || `Save failed (${res.status})`);
        }

        // Update local row with returned data
        setRows((prev) =>
          prev.map((r) =>
            String(r.id) === id ? { ...r, ...body.row } : r
          )
        );
        setEditingId(null);
        setDraft({});
        toast.success("Row updated", {
          description: "Database updated — refreshing dashboard.",
        });
        // Refresh the dashboard so KPIs / charts reflect the change
        onDataUpdated?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        toast.error("Update failed", { description: msg });
      } finally {
        setSaving(false);
      }
    },
    [columns, draft, tableType, onDataUpdated]
  );

  // ===========================================================================
  //  Render
  // ===========================================================================

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">Editable Data Table</CardTitle>
              <p className="text-xs text-slate-500">
                {tableType === "daily"
                  ? "Daily Campaign (Days 1–3)"
                  : "Catch-up Campaign (Day 4)"}{" "}
                — click{" "}
                <Pencil className="inline h-3 w-3 text-slate-400" /> to edit a
                row
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showToggle && (
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <button
                  onClick={() => setTableType("daily")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    tableType === "daily"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTableType("catchup")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    tableType === "catchup"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Catch-up
                </button>
              </div>
            )}
            <Badge variant="secondary">{rows.length} rows</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchRows()}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error banner */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Loading rows…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No rows match the current filters.
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-sm">
              {/* ============================================================= */}
              {/*  Sticky header (group row + column row)                       */}
              {/* ============================================================= */}
              <TableHeader className="sticky top-0 z-30">
                {/* ---- Group header row ---- */}
                <TableRow className="border-b border-slate-300 bg-slate-100 hover:bg-slate-100">
                  {groupSpans.map((span, i) => (
                    <th
                      key={`group-${i}`}
                      colSpan={span.count}
                      className={cn(
                        "border-b border-r border-slate-300 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500",
                        span.frozen && "bg-slate-200"
                      )}
                      style={
                        span.frozen
                          ? { position: "sticky", left: 0, zIndex: 25 }
                          : undefined
                      }
                    >
                      {span.group}
                    </th>
                  ))}
                  <th
                    className="border-b border-l border-slate-300 bg-slate-200 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    style={{ position: "sticky", right: 0, zIndex: 25 }}
                  >
                    Actions
                  </th>
                </TableRow>

                {/* ---- Column header row ---- */}
                <TableRow className="border-b border-slate-300 bg-white hover:bg-white">
                  {columns.map((col) => {
                    const isFrozen = !!col.frozen;
                    const left = isFrozen
                      ? frozenLeftOffset(col, columns)
                      : 0;
                    const width = isFrozen ? frozenWidth(col) : undefined;
                    const isNumeric =
                      col.type === "number" || col.type === "percent";
                    return (
                      <TableHead
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap border-b border-r border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-700",
                          isNumeric ? "text-right" : "text-left",
                          isFrozen && "bg-slate-50"
                        )}
                        style={
                          isFrozen
                            ? {
                                position: "sticky",
                                left,
                                zIndex: 25,
                                minWidth: width,
                              }
                            : { minWidth: 90 }
                        }
                      >
                        {col.label}
                      </TableHead>
                    );
                  })}
                  <TableHead
                    className="border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold text-slate-700"
                    style={{
                      position: "sticky",
                      right: 0,
                      zIndex: 25,
                      minWidth: ACTIONS_WIDTH,
                    }}
                  >
                    Edit / Save
                  </TableHead>
                </TableRow>
              </TableHeader>

              {/* ============================================================= */}
              {/*  Data rows                                                     */}
              {/* ============================================================= */}
              <TableBody>
                {rows.map((row, rowIdx) => {
                  const rowId = String(row.id ?? `row-${rowIdx}`);
                  const isEditing = editingId === rowId;

                  // Background for frozen cells (must be opaque for sticky to work)
                  const frozenBg = isEditing
                    ? "bg-blue-50 group-hover:bg-blue-100"
                    : rowIdx % 2 === 1
                      ? "bg-slate-50 group-hover:bg-slate-100"
                      : "bg-white group-hover:bg-slate-100";

                  return (
                    <TableRow
                      key={rowId}
                      className={cn(
                        "group border-b border-slate-100",
                        isEditing && "bg-blue-50"
                      )}
                    >
                      {columns.map((col) => {
                        const isFrozen = !!col.frozen;
                        const left = isFrozen
                          ? frozenLeftOffset(col, columns)
                          : 0;
                        const width = isFrozen
                          ? frozenWidth(col)
                          : undefined;
                        const isNumeric =
                          col.type === "number" || col.type === "percent";

                        return (
                          <TableCell
                            key={col.key}
                            className={cn(
                              "whitespace-nowrap border-b border-r border-slate-100 px-2 py-1.5 text-xs",
                              isNumeric
                                ? "text-right tabular-nums text-slate-600"
                                : "text-left text-slate-700",
                              isFrozen && frozenBg
                            )}
                            style={
                              isFrozen
                                ? {
                                    position: "sticky",
                                    left,
                                    zIndex: isEditing ? 15 : 10,
                                    minWidth: width,
                                  }
                                : { minWidth: 90 }
                            }
                          >
                            {isEditing && col.editable ? (
                              <Input
                                type={isNumeric ? "number" : "text"}
                                value={draft[col.key] ?? ""}
                                onChange={(e) =>
                                  updateDraft(col.key, e.target.value)
                                }
                                className="h-7 w-20 px-1.5 py-0.5 text-xs"
                                step={col.type === "percent" ? "0.1" : "1"}
                                disabled={saving}
                              />
                            ) : (
                              <span>{displayValue(col, row[col.key])}</span>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* ---- Actions cell (frozen right) ---- */}
                      <TableCell
                        className={cn(
                          "border-b border-l border-slate-100 px-2 py-1.5 text-center",
                          frozenBg
                        )}
                        style={{
                          position: "sticky",
                          right: 0,
                          zIndex: isEditing ? 15 : 10,
                          minWidth: ACTIONS_WIDTH,
                        }}
                      >
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              className="h-7 w-7 bg-green-600 hover:bg-green-700"
                              onClick={() => void saveRow(row)}
                              disabled={saving}
                              title="Save changes"
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={cancelEdit}
                              disabled={saving}
                              title="Cancel edit"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => startEdit(row)}
                            title="Edit row"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
        )}

        {/* Footer note */}
        {rows.length > 0 && !loading && (
          <p className="mt-2 text-xs text-slate-400">
            Showing {rows.length}{" "}
            {tableType === "daily" ? "daily" : "catch-up"} rows • Edit a row
            and click{" "}
            <Check className="inline h-3 w-3 text-green-600" /> to save changes
            to the database.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
