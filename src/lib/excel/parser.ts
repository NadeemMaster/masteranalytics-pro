// ============================================================================
//  MasterAnalytics Pro — Excel Parser
//  Reads .xlsx files via SheetJS, normalizes headers, cleans values
//  (* / empty / NA → 0 | null), and maps rows to typed DB inserts.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import * as XLSX from "xlsx";

import { normalizeHeader, buildHeaderIndex } from "./normalize";
import { DAILY_COLUMN_MAP, CATCHUP_COLUMN_MAP } from "./column-maps";
import { toNumber, toNullableNumber, toCleanString } from "@/lib/utils";
import type {
  DailyCampaignInsert,
  CatchupCampaignInsert,
} from "@/types/database";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type RowStatus = "ok" | "skipped" | "error";

export interface ParsedRowResult<T> {
  status: RowStatus;
  reason?: string;
  rowNumber: number; // 1-based Excel row number (header = row 1)
  data?: T;
  raw?: Record<string, unknown>;
}

export interface ParseSummary {
  fileName: string;
  sheetName: string;
  totalRows: number;
  dailyRows: DailyCampaignInsert[];
  catchupRows: CatchupCampaignInsert[];
  skipped: ParsedRowResult<never>[];
  errors: ParsedRowResult<never>[];
  unmappedHeaders: string[];
}

// ---------------------------------------------------------------------------
//  Column type metadata
//  Tells the parser which columns are strings vs numbers vs percentages.
//  Anything not listed here defaults to "number" via toNumber().
// ---------------------------------------------------------------------------

const STRING_FIELDS_DAILY = new Set([
  "tehsil",
  "uc_name",
  "campaign_name",
]);

const STRING_FIELDS_CATCHUP = new Set([
  "tehsil",
  "uc_name",
  "campaign_name",
]);

// Fields that should use toNullableNumber (keep null instead of 0)
// — currently none in our schema (everything has DEFAULT 0), but kept for future use.
const NULLABLE_FIELDS = new Set<string>([]);

// ---------------------------------------------------------------------------
//  Main parse function
// ---------------------------------------------------------------------------

/**
 * Parse an Excel file buffer into typed DB rows.
 *
 * @param fileBuffer  ArrayBuffer | Uint8Array of the .xlsx file
 * @param fileName    Original filename (for the summary)
 */
export function parseExcelFile(
  fileBuffer: ArrayBuffer | Uint8Array,
  fileName: string
): ParseSummary {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: false });

  // Pick the sheet: prefer "lqp" (your convention), else first sheet.
  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase() === "lqp") ??
    workbook.SheetNames[0];

  if (!sheetName) {
    return {
      fileName,
      sheetName: "",
      totalRows: 0,
      dailyRows: [],
      catchupRows: [],
      skipped: [],
      errors: [],
      unmappedHeaders: [],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  // header: 1 → array-of-arrays; defval: "" → treat empty as empty string;
  // blankrows: false → skip fully-blank rows.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });

  if (rows.length < 2) {
    return {
      fileName,
      sheetName,
      totalRows: 0,
      dailyRows: [],
      catchupRows: [],
      skipped: [],
      errors: [],
      unmappedHeaders: [],
    };
  }

  const headerRow = rows[0] as unknown[];
  const headerIndex = buildHeaderIndex(headerRow);

  // Detect unmapped headers (for diagnostics)
  const unmappedHeaders: string[] = [];
  for (const h of headerRow) {
    const key = normalizeHeader(h);
    if (key && !DAILY_COLUMN_MAP[key] && !CATCHUP_COLUMN_MAP[key]) {
      unmappedHeaders.push(String(h));
    }
  }

  // Find the "Campaign Day" column index once
  const dayColIdx = headerIndex.get("campaignday");

  const dailyRows: DailyCampaignInsert[] = [];
  const catchupRows: CatchupCampaignInsert[] = [];
  const skipped: ParsedRowResult<never>[] = [];
  const errors: ParsedRowResult<never>[] = [];

  // Iterate data rows (skip header)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const rowNumber = r + 1; // 1-based, header is row 1

    // ---- Determine campaign_day FIRST — this decides which table ----
    let campaignDay: number | null = null;
    if (dayColIdx !== undefined) {
      const rawDay = row[dayColIdx];
      campaignDay = toNullableNumber(rawDay);
    }

    if (campaignDay === null) {
      skipped.push({
        status: "skipped",
        rowNumber,
        reason: "Missing 'Campaign Day' value",
      });
      continue;
    }

    const day = Math.round(campaignDay);

    if (day >= 1 && day <= 3) {
      const result = mapRow<DailyCampaignInsert>(
        row,
        headerIndex,
        DAILY_COLUMN_MAP,
        STRING_FIELDS_DAILY,
        rowNumber
      );
      if (result.data) {
        // Force campaign_day to the cleaned integer
        result.data.campaign_day = day as 1 | 2 | 3;
        dailyRows.push(result.data);
      } else {
        errors.push({
          status: "error",
          rowNumber,
          reason: result.reason,
        });
      }
    } else if (day === 4) {
      const result = mapRow<CatchupCampaignInsert>(
        row,
        headerIndex,
        CATCHUP_COLUMN_MAP,
        STRING_FIELDS_CATCHUP,
        rowNumber
      );
      if (result.data) {
        result.data.campaign_day = 4;
        catchupRows.push(result.data);
      } else {
        errors.push({
          status: "error",
          rowNumber,
          reason: result.reason,
        });
      }
    } else {
      skipped.push({
        status: "skipped",
        rowNumber,
        reason: `Unexpected Campaign Day value: ${day} (expected 1, 2, 3, or 4)`,
      });
    }
  }

  return {
    fileName,
    sheetName,
    totalRows: rows.length - 1, // exclude header
    dailyRows,
    catchupRows,
    skipped,
    errors,
    unmappedHeaders,
  };
}

// ---------------------------------------------------------------------------
//  Row mapper (generic over daily / catchup)
// ---------------------------------------------------------------------------

interface MapResult<T> {
  data: T | null;
  reason?: string;
}

function mapRow<T extends Record<string, unknown>>(
  row: unknown[],
  headerIndex: Map<string, number>,
  columnMap: Record<string, string>,
  stringFields: Set<string>,
  _rowNumber: number
): MapResult<T> {
  const out: Record<string, unknown> = {};
  const raw: Record<string, unknown> = {};

  // Required identifier fields — fail fast if missing
  const idFields = ["tehsil", "campaign_name", "uc_name"];

  for (const [normalizedHeader, dbField] of Object.entries(columnMap)) {
    const colIdx = headerIndex.get(normalizedHeader);
    if (colIdx === undefined) continue; // column not present in this file

    const cellValue = row[colIdx];

    // Preserve raw value (for raw_data JSONB)
    if (cellValue !== "" && cellValue !== null && cellValue !== undefined) {
      raw[normalizedHeader] = cellValue;
    }

    // Clean + coerce based on field type
    if (stringFields.has(dbField)) {
      out[dbField] = toCleanString(cellValue);
    } else if (dbField === "campaign_day") {
      // handled by caller — skip here
      continue;
    } else if (NULLABLE_FIELDS.has(dbField)) {
      out[dbField] = toNullableNumber(cellValue);
    } else {
      out[dbField] = toNumber(cellValue);
    }
  }

  // Validate required identifier fields
  for (const f of idFields) {
    if (!out[f] || String(out[f]).trim() === "") {
      return {
        data: null,
        reason: `Missing required field '${f}'`,
      };
    }
  }

  // Attach raw_data (full original row for traceability)
  out.raw_data = raw as never;

  return { data: out as T };
}
