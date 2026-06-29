// ============================================================================
//  MasterAnalytics Pro — /api/rows Route Handler
//  GET    — fetch rows for the editable table (filtered by campaign/tehsil/uc/day)
//  PATCH  — update a single row's editable fields by id
//
//  Auth: requires a valid session (RLS also enforces user_id ownership).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import {
  getSelectString,
  getEditableKeys,
  coerceValue,
} from "@/lib/dashboard/columns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
//  Response shapes
// ---------------------------------------------------------------------------

interface RowListResponse {
  table: "daily" | "catchup";
  rows: Record<string, unknown>[];
  total: number;
}

interface RowUpdateResponse {
  success: boolean;
  row: Record<string, unknown> | null;
  error?: string;
}

// ---------------------------------------------------------------------------
//  GET /api/rows?campaign=...&tehsil=...&uc=...&day=...&table=daily|catchup
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse query params ----
  const { searchParams } = new URL(request.url);
  const campaign = searchParams.get("campaign") || "";
  const tehsil = searchParams.get("tehsil") || undefined;
  const uc = searchParams.get("uc") || undefined;
  const dayParam = searchParams.get("day");
  const tableParam = searchParams.get("table") || "daily";

  // Determine the table: "catchup" if day=4 or table=catchup
  const table: "daily" | "catchup" =
    tableParam === "catchup" || dayParam === "4" ? "catchup" : "daily";

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign name is required. Use ?campaign=NID+FEB+2026" },
      { status: 400 }
    );
  }

  // ---- 3. Build the query ----
  const supabase = await createClient();
  const tableName = table === "daily" ? "daily_campaign_data" : "catchup_campaign_data";
  const selectStr = getSelectString(table);

  let query = supabase
    .from(tableName)
    .select(selectStr)
    .eq("user_id", user.id)
    .eq("campaign_name", campaign)
    .order("tehsil", { ascending: true })
    .order("uc_name", { ascending: true })
    .order("campaign_day", { ascending: true })
    .limit(500);

  if (tehsil) query = query.eq("tehsil", tehsil);
  if (uc) query = query.eq("uc_name", uc);
  if (dayParam && dayParam !== "all") {
    const dayNum = parseInt(dayParam, 10);
    if (Number.isFinite(dayNum)) query = query.eq("campaign_day", dayNum);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[rows] ${tableName} query error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch rows.", detail: error.message },
      { status: 500 }
    );
  }

  const result: RowListResponse = {
    table,
    rows: (data as Record<string, unknown>[]) ?? [],
    total: data?.length ?? 0,
  };

  return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
//  PATCH /api/rows
//  Body: { table: "daily" | "catchup", id: string, changes: { col: value } }
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Parse the request body ----
  let body: { table?: string; id?: string; changes?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { table: tableRaw, id, changes } = body;

  if (!tableRaw || (tableRaw !== "daily" && tableRaw !== "catchup")) {
    return NextResponse.json(
      { error: 'Invalid or missing "table". Must be "daily" or "catchup".' },
      { status: 400 }
    );
  }
  const table = tableRaw as "daily" | "catchup";

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: 'Missing or invalid "id".' },
      { status: 400 }
    );
  }

  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty "changes" object.' },
      { status: 400 }
    );
  }

  // ---- 3. Validate + coerce the changes ----
  const editableKeys = new Set(getEditableKeys(table));
  const cleaned: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(changes)) {
    if (!editableKeys.has(key)) {
      return NextResponse.json(
        { error: `Column "${key}" is not editable.` },
        { status: 400 }
      );
    }
    try {
      cleaned[key] = coerceValue(key, value, table);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation failed.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // ---- 4. Update the row in Supabase ----
  const supabase = await createClient();
  const tableName = table === "daily" ? "daily_campaign_data" : "catchup_campaign_data";
  const selectStr = getSelectString(table);

  const { data, error } = await supabase
    .from(tableName)
    .update(cleaned as never)
    .eq("id", id)
    .eq("user_id", user.id) // RLS double-check
    .select(selectStr)
    .single();

  if (error) {
    console.error(`[rows] ${tableName} update error:`, error);
    const result: RowUpdateResponse = {
      success: false,
      row: null,
      error: error.message,
    };
    return NextResponse.json(result, { status: 500 });
  }

  const result: RowUpdateResponse = {
    success: true,
    row: (data as Record<string, unknown>) ?? null,
  };

  return NextResponse.json(result);
}
