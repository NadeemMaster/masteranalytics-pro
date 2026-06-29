// ============================================================================
//  MasterAnalytics Pro — Editable Column Definitions
//  Single source of truth for the Excel-like editable table view.
//  Defines which columns to show, their labels, types, and editability.
//  Used by /api/rows (validation) and <EditableTable /> (rendering).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

export type ColumnType = "string" | "number" | "percent";

export interface ColumnDef {
  /** DB column name (matches supabase/schema.sql) */
  key: string;
  /** Human-readable label (mirrors the Excel header) */
  label: string;
  /** Value type — controls input rendering + validation */
  type: ColumnType;
  /** Logical group header shown above the column cluster */
  group: string;
  /** Whether the user can edit this field in the table */
  editable: boolean;
  /** Whether this column is frozen (sticky left) in the horizontal scroll */
  frozen?: boolean;
}

// ---------------------------------------------------------------------------
//  DAILY COLUMNS (Days 1, 2, 3)
//  Order mirrors the original sia_daily_report_day_1.xlsx layout.
// ---------------------------------------------------------------------------

export const DAILY_COLUMNS: ColumnDef[] = [
  // ---- Identifiers (frozen) ----
  { key: "tehsil", label: "Tehsil", type: "string", group: "Identifiers", editable: true, frozen: true },
  { key: "uc_name", label: "UC Name", type: "string", group: "Identifiers", editable: true, frozen: true },
  { key: "campaign_day", label: "Day", type: "number", group: "Identifiers", editable: true, frozen: true },

  // ---- Core targets & coverage ----
  { key: "over_all_target", label: "Over-all Target", type: "number", group: "Targets & Coverage", editable: true },
  { key: "teams_reported", label: "Teams Reported", type: "number", group: "Targets & Coverage", editable: true },
  { key: "houses_planned", label: "Houses Planned", type: "number", group: "Targets & Coverage", editable: true },
  { key: "houses_visited", label: "Houses Visited", type: "number", group: "Targets & Coverage", editable: true },
  { key: "target_hh_0_59", label: "Target HH 0-59", type: "number", group: "Targets & Coverage", editable: true },
  { key: "first_visit_hh_0_59", label: "1st Visit HH 0-59", type: "number", group: "Targets & Coverage", editable: true },
  { key: "zero_zero_houses", label: "00 Houses", type: "number", group: "Targets & Coverage", editable: true },
  { key: "locked_houses", label: "Locked Houses", type: "number", group: "Targets & Coverage", editable: true },

  // ---- Vitamin A ----
  { key: "vita_6_11", label: "Vit-A 6-11", type: "number", group: "Vitamin A", editable: true },
  { key: "vita_12_59", label: "Vit-A 12-59", type: "number", group: "Vitamin A", editable: true },

  // ---- Missed children ----
  { key: "missed_na_0_59", label: "Missed NA 0-59", type: "number", group: "Missed Children", editable: true },
  { key: "missed_ref_0_59", label: "Missed Ref 0-59", type: "number", group: "Missed Children", editable: true },
  { key: "missed_covered_na", label: "Missed Covered NA", type: "number", group: "Missed Children", editable: true },
  { key: "missed_covered_ref", label: "Missed Covered Ref", type: "number", group: "Missed Children", editable: true },

  // ---- Vaccination sites ----
  { key: "vaccinated_school", label: "Vaccinated School", type: "number", group: "Vaccination Sites", editable: true },
  { key: "guest_vaccinated", label: "Guest Vaccinated", type: "number", group: "Vaccination Sites", editable: true },
  { key: "vaccinated_streets", label: "Vaccinated Streets", type: "number", group: "Vaccination Sites", editable: true },
  { key: "mmp_vaccinated", label: "MMP Vaccinated", type: "number", group: "Vaccination Sites", editable: true },
  { key: "vaccinated_fix_site", label: "Vaccinated Fix Site", type: "number", group: "Vaccination Sites", editable: true },
  { key: "vaccinated_transit", label: "Vaccinated Transit", type: "number", group: "Vaccination Sites", editable: true },

  // ---- OPV / Finger markers ----
  { key: "finger_markers", label: "Finger Markers", type: "number", group: "OPV & Markers", editable: true },
  { key: "opv_issued", label: "OPV Issued", type: "number", group: "OPV & Markers", editable: true },
  { key: "opv_used", label: "OPV Used", type: "number", group: "OPV & Markers", editable: true },
  { key: "opv_returned", label: "OPV Returned", type: "number", group: "OPV & Markers", editable: true },
  { key: "total_capsules_given", label: "Capsules Given", type: "number", group: "OPV & Markers", editable: true },
  { key: "total_capsules_used", label: "Capsules Used", type: "number", group: "OPV & Markers", editable: true },
  { key: "total_capsules_return", label: "Capsules Returned", type: "number", group: "OPV & Markers", editable: true },

  // ---- Surveillance ----
  { key: "afp_reported", label: "AFP Reported", type: "number", group: "Surveillance", editable: true },
  { key: "zero_dose_recorded", label: "Zero Dose Recorded", type: "number", group: "Surveillance", editable: true },

  // ---- Coverage metrics ----
  { key: "admin_coverage", label: "Admin Coverage", type: "number", group: "Coverage Metrics", editable: true },
  { key: "admin_coverage_pct", label: "Admin Coverage %", type: "percent", group: "Coverage Metrics", editable: true },
  { key: "same_day_missed_pct", label: "Same-day Missed %", type: "percent", group: "Coverage Metrics", editable: true },
  { key: "vaccine_utilization", label: "Vaccine Utilization", type: "number", group: "Coverage Metrics", editable: true },
  { key: "hh_coverage", label: "HH Coverage", type: "number", group: "Coverage Metrics", editable: true },
  { key: "hh_coverage_pct", label: "HH Coverage %", type: "percent", group: "Coverage Metrics", editable: true },

  // ---- PMC / SMC ----
  { key: "covered_na_smc_prev", label: "Covered NA SMC Prev", type: "number", group: "PMC / SMC", editable: true },
  { key: "round2_pmc", label: "2-Round PMC", type: "number", group: "PMC / SMC", editable: true },
  { key: "round3_pmc", label: "3-Round PMC", type: "number", group: "PMC / SMC", editable: true },

  // ---- Refusals ----
  { key: "total_refusal", label: "Total Refusal", type: "number", group: "Refusals", editable: true },
  { key: "medical_refusal", label: "Medical Refusal", type: "number", group: "Refusals", editable: true },
  { key: "soft_refusal", label: "Soft Refusal", type: "number", group: "Refusals", editable: true },

  // ---- MMP ----
  { key: "mmp_registration", label: "MMP Registration", type: "number", group: "MMP", editable: true },
  { key: "mmp_covered_existing", label: "MMP Covered Existing", type: "number", group: "MMP", editable: true },
  { key: "mmp_missed_existing", label: "MMP Missed Existing", type: "number", group: "MMP", editable: true },
  { key: "mmp_newly_arrived_covered", label: "MMP Newly Arrived", type: "number", group: "MMP", editable: true },
  { key: "shifted_mmp", label: "Shifted MMP", type: "number", group: "MMP", editable: true },

  // ---- Still missed ----
  { key: "still_missed_in_uc", label: "Still Missed in UC", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_uc_tehsil", label: "Missed Out UC/Tehsil", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_tehsil_district", label: "Missed Out Tehsil/District", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_district", label: "Missed Out District", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_province", label: "Missed Out Province", type: "number", group: "Still Missed", editable: true },
];

// ---------------------------------------------------------------------------
//  CATCH-UP COLUMNS (Day 4)
//  Order mirrors the original sia_catchup_report_day_4.xlsx layout.
// ---------------------------------------------------------------------------

export const CATCHUP_COLUMNS: ColumnDef[] = [
  // ---- Identifiers (frozen) ----
  { key: "tehsil", label: "Tehsil", type: "string", group: "Identifiers", editable: true, frozen: true },
  { key: "uc_name", label: "UC Name", type: "string", group: "Identifiers", editable: true, frozen: true },
  { key: "campaign_day", label: "Day", type: "number", group: "Identifiers", editable: true, frozen: true },

  // ---- Target & covered missed children ----
  { key: "target_missed_na", label: "Target Missed NA", type: "number", group: "Missed Children", editable: true },
  { key: "target_missed_ref", label: "Target Missed Ref", type: "number", group: "Missed Children", editable: true },
  { key: "covered_missed_na", label: "Covered Missed NA", type: "number", group: "Missed Children", editable: true },
  { key: "covered_missed_ref", label: "Covered Missed Ref", type: "number", group: "Missed Children", editable: true },

  // ---- Houses ----
  { key: "zero_zero_houses", label: "00 Houses", type: "number", group: "Houses", editable: true },
  { key: "locked_houses", label: "Locked Houses", type: "number", group: "Houses", editable: true },

  // ---- Vaccination ----
  { key: "guest_vaccinated", label: "Guest Vaccinated", type: "number", group: "Vaccination", editable: true },
  { key: "unrecorded_vaccinated", label: "Unrecorded Vaccinated", type: "number", group: "Vaccination", editable: true },
  { key: "mmp_covered_catchup", label: "MMP Covered Catch-up", type: "number", group: "Vaccination", editable: true },
  { key: "pmc_recorded", label: "PMC Recorded", type: "number", group: "Vaccination", editable: true },

  // ---- OPV ----
  { key: "opv_issued", label: "OPV Issued", type: "number", group: "OPV", editable: true },
  { key: "opv_used", label: "OPV Used", type: "number", group: "OPV", editable: true },
  { key: "opv_returned", label: "OPV Returned", type: "number", group: "OPV", editable: true },

  // ---- Surveillance ----
  { key: "afp_reported", label: "AFP Reported", type: "number", group: "Surveillance", editable: true },
  { key: "zero_dose_recorded", label: "Zero Dose Recorded", type: "number", group: "Surveillance", editable: true },

  // ---- Vitamin A ----
  { key: "vita_blue_given", label: "Vit-A Blue Given", type: "number", group: "Vitamin A", editable: true },
  { key: "vita_red_given", label: "Vit-A Red Given", type: "number", group: "Vitamin A", editable: true },

  // ---- Vaccination sites ----
  { key: "vaccinated_fix_site", label: "Vaccinated Fix Site", type: "number", group: "Vaccination Sites", editable: true },
  { key: "vaccinated_transit", label: "Vaccinated Transit", type: "number", group: "Vaccination Sites", editable: true },

  // ---- Coverage ----
  { key: "total_coverage", label: "Total Coverage", type: "number", group: "Coverage", editable: true },
  { key: "total_coverage_pct", label: "Total Coverage %", type: "percent", group: "Coverage", editable: true },
  { key: "still_missed", label: "Still Missed", type: "number", group: "Coverage", editable: true },

  // ---- PMC / SMC ----
  { key: "covered_na_smc_prev", label: "Covered NA SMC Prev", type: "number", group: "PMC / SMC", editable: true },
  { key: "round2_pmc", label: "2-Round PMC", type: "number", group: "PMC / SMC", editable: true },
  { key: "round3_pmc", label: "3-Round PMC", type: "number", group: "PMC / SMC", editable: true },

  // ---- Refusals ----
  { key: "total_refusal", label: "Total Refusal", type: "number", group: "Refusals", editable: true },
  { key: "medical_refusal", label: "Medical Refusal", type: "number", group: "Refusals", editable: true },
  { key: "soft_refusal", label: "Soft Refusal", type: "number", group: "Refusals", editable: true },

  // ---- MMP ----
  { key: "mmp_registration", label: "MMP Registration", type: "number", group: "MMP", editable: true },
  { key: "mmp_covered_existing", label: "MMP Covered Existing", type: "number", group: "MMP", editable: true },
  { key: "mmp_missed_existing", label: "MMP Missed Existing", type: "number", group: "MMP", editable: true },
  { key: "mmp_newly_arrived_covered", label: "MMP Newly Arrived", type: "number", group: "MMP", editable: true },
  { key: "shifted_mmp", label: "Shifted MMP", type: "number", group: "MMP", editable: true },

  // ---- Still missed ----
  { key: "still_missed_in_uc", label: "Still Missed in UC", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_uc_tehsil", label: "Missed Out UC/Tehsil", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_tehsil_district", label: "Missed Out Tehsil/District", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_district", label: "Missed Out District", type: "number", group: "Still Missed", editable: true },
  { key: "still_missed_out_province", label: "Missed Out Province", type: "number", group: "Still Missed", editable: true },
];

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Get the column definitions for a given table type. */
export function getColumns(table: "daily" | "catchup"): ColumnDef[] {
  return table === "daily" ? DAILY_COLUMNS : CATCHUP_COLUMNS;
}

/** Get the list of editable column keys for a given table. */
export function getEditableKeys(table: "daily" | "catchup"): string[] {
  return getColumns(table)
    .filter((c) => c.editable)
    .map((c) => c.key);
}

/** Get the comma-separated select string for a given table (all columns). */
export function getSelectString(table: "daily" | "catchup"): string {
  const keys = getColumns(table).map((c) => c.key);
  // Always include id + campaign_name for identification
  return ["id", "campaign_name", ...keys].join(", ");
}

/** Validate + coerce a value for a given column type. */
export function coerceValue(key: string, value: unknown, table: "daily" | "catchup"): string | number {
  const col = getColumns(table).find((c) => c.key === key);
  if (!col) {
    throw new Error(`Unknown column: ${key}`);
  }

  if (col.type === "string") {
    return String(value ?? "").trim();
  }

  // number | percent — parse to a finite number, default 0
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return 0;
  return num;
}
