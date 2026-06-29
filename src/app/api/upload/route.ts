// ============================================================================
//  MasterAnalytics Pro — /api/upload Route Handler
//  Accepts a .xlsx file, parses it via the SheetJS parser, and upserts the
//  resulting rows into the daily_campaign_data / catchup_campaign_data tables.
//
//  Cumulative-replace rule:
//    The unique constraint on both tables is (user_id, campaign_name,
//    tehsil, uc_name) — campaign_day is intentionally NOT in the conflict
//    key. So uploading Day 2 for the same UC REPLACES the Day 1 row.
//    Day 4 rows are routed to the catch-up table.
//
//  Auth: requires a valid session (RLS also enforces user_id ownership).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { NextResponse } from "next/server";

import { createClient, getUser } from "@/lib/supabase/server";
import { parseExcelFile } from "@/lib/excel/parser";
import type {
  DailyCampaignInsert,
  CatchupCampaignInsert,
} from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXT = [".xlsx", ".xls"];

// ---------------------------------------------------------------------------
//  Response shape (mirrors what the upload-form client expects)
// ---------------------------------------------------------------------------

interface UploadResult {
  success: boolean;
  fileName: string;
  sheetName: string;
  totalRows: number;
  daily: { parsed: number; upserted: number; error: string | null };
  catchup: { parsed: number; upserted: number; error: string | null };
  skipped: { rowNumber: number; reason: string }[];
  rowErrors: { rowNumber: number; reason: string }[];
  unmappedHeaders: string[];
  message: string;
}

export async function POST(request: Request) {
  // ---- 1. Authenticate ----
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  // ---- 2. Validate content type ----
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data request." },
      { status: 400 }
    );
  }

  // ---- 3. Extract the file from form data ----
  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json(
      { error: "Could not read multipart form data." },
      { status: 400 }
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "No file provided. Attach a .xlsx file under the 'file' field." },
      { status: 400 }
    );
  }

  const fileName = file.name ?? "upload.xlsx";

  // ---- 4. Validate extension + size ----
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ACCEPTED_EXT.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Accepted: ${ACCEPTED_EXT.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "File is empty." },
      { status: 400 }
    );
  }

  // ---- 5. Read + parse the Excel buffer ----
  let parseSummary;
  try {
    const arrayBuffer = await file.arrayBuffer();
    parseSummary = parseExcelFile(arrayBuffer, fileName);
  } catch (err) {
    console.error("[upload] Excel parse error:", err);
    return NextResponse.json(
      {
        error:
          "Could not parse the Excel file. Ensure it is a valid .xlsx workbook.",
      },
      { status: 422 }
    );
  }

  const {
    sheetName,
    totalRows,
    dailyRows,
    catchupRows,
    skipped,
    errors,
    unmappedHeaders,
  } = parseSummary;

  // ---- 6. Upsert rows into Supabase ----
  const supabase = await createClient();

  // Inject the authenticated user_id into every row (RLS validates this too).
  const dailyPayload: DailyCampaignInsert[] = dailyRows.map((r) => ({
    ...r,
    user_id: user.id,
  }));
  const catchupPayload: CatchupCampaignInsert[] = catchupRows.map((r) => ({
    ...r,
    user_id: user.id,
  }));

  let dailyUpserted = 0;
  let dailyError: string | null = null;
  let catchupUpserted = 0;
  let catchupError: string | null = null;

  // Daily upsert — ON CONFLICT (user_id, campaign_name, tehsil, uc_name) DO UPDATE.
  // This enforces the cumulative-replace rule (Day 2 replaces Day 1 for same UC).
  if (dailyPayload.length > 0) {
    const { error } = await supabase
      .from("daily_campaign_data")
      .upsert(dailyPayload as never, {
        onConflict: "user_id,campaign_name,tehsil,uc_name",
        ignoreDuplicates: false,
      });
    if (error) {
      console.error("[upload] daily upsert error:", error);
      dailyError = error.message;
    } else {
      dailyUpserted = dailyPayload.length;
    }
  }

  // Catch-up upsert — same conflict pattern, Day 4 only.
  if (catchupPayload.length > 0) {
    const { error } = await supabase
      .from("catchup_campaign_data")
      .upsert(catchupPayload as never, {
        onConflict: "user_id,campaign_name,tehsil,uc_name",
        ignoreDuplicates: false,
      });
    if (error) {
      console.error("[upload] catchup upsert error:", error);
      catchupError = error.message;
    } else {
      catchupUpserted = catchupPayload.length;
    }
  }

  // ---- 7. Build the response ----
  const hasErrors = dailyError || catchupError;
  const hasPartialData = dailyUpserted > 0 || catchupUpserted > 0;

  let message: string;
  if (!hasErrors && hasPartialData) {
    message = `Uploaded ${dailyUpserted + catchupUpserted} row(s) successfully.`;
  } else if (hasErrors && hasPartialData) {
    message = `Partial upload: ${dailyUpserted + catchupUpserted} row(s) saved, but some tables failed.`;
  } else if (hasErrors) {
    message = "Upload failed — no rows were saved.";
  } else if (totalRows === 0) {
    message = "File parsed, but no data rows were found.";
  } else {
    message = "File parsed, but no rows matched the daily (Days 1–3) or catch-up (Day 4) layout.";
  }

  const result: UploadResult = {
    success: !hasErrors,
    fileName,
    sheetName,
    totalRows,
    daily: { parsed: dailyRows.length, upserted: dailyUpserted, error: dailyError },
    catchup: {
      parsed: catchupRows.length,
      upserted: catchupUpserted,
      error: catchupError,
    },
    skipped: skipped.map((s) => ({ rowNumber: s.rowNumber, reason: s.reason ?? "Unknown" })),
    rowErrors: errors.map((e) => ({ rowNumber: e.rowNumber, reason: e.reason ?? "Unknown" })),
    unmappedHeaders,
    message,
  };

  // 207 Multi-Status for partial errors, 200 for full success, 422 if nothing saved.
  const status = hasErrors
    ? hasPartialData
      ? 207
      : 422
    : 200;

  return NextResponse.json(result, { status });
}
