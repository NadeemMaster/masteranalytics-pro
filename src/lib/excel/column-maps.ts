// ============================================================================
//  MasterAnalytics Pro — Excel → DB Column Maps
//  Maps normalized Excel headers to typed DB columns.
//  Derived from the actual sia_daily_report_day_1.xlsx (55 cols) and
//  sia_catchup_report_day_4.xlsx (42 cols).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

/**
 * Daily campaign (Days 1, 2, 3) — Excel header → DB column.
 * Key = normalizeHeader() output. Value = DB column name in daily_campaign_data.
 */
export const DAILY_COLUMN_MAP: Record<string, string> = {
  // Identifiers (special — handled separately, but kept here for completeness)
  tehsil: "tehsil",
  campaignname: "campaign_name",
  campaignday: "campaign_day",
  ucname: "uc_name",
  uc: "uc_name", // fallback if daily file uses "UC" instead of "UC name"

  // Core targets & coverage
  overalltarget: "over_all_target",
  teamsreported: "teams_reported",
  numberofhousesplannedfrommp: "houses_planned",
  numberofhousesvisited: "houses_visited",
  targethh059: "target_hh_0_59",
  "1stvisitcoveragehh059": "first_visit_hh_0_59",
  "00houses": "zero_zero_houses",
  lockedhouses: "locked_houses",

  // Vitamin A
  vitaminacoverage611: "vita_6_11",
  vitaminacoverage1259: "vita_12_59",

  // Missed children
  missedchildrenrecordedna059: "missed_na_0_59",
  missedchildrenrecordedref059: "missed_ref_0_59",
  missedchildrencoveredna059: "missed_covered_na",
  missedchildrencoveredref059: "missed_covered_ref",

  // Vaccination sites
  vaccinatedschool: "vaccinated_school",
  guestvaccinated: "guest_vaccinated",
  vaccinatedinstreets: "vaccinated_streets",
  mmpvaccinated: "mmp_vaccinated",
  vaccinatedatfixsite: "vaccinated_fix_site",
  vaccinatedattransitsite: "vaccinated_transit",

  // OPV / Finger markers
  offingermarkersissued: "finger_markers",
  opvgiven: "opv_issued",
  opvissued: "opv_issued", // alias — "OPV Issued" header (renamed from "OPV Given")
  opvused: "opv_used",
  opvreturned: "opv_returned",
  totalcapsulesgivenredblue: "total_capsules_given",
  totalcapsulesusedredblue: "total_capsules_used",
  totalcapsulesreturnedredblue: "total_capsules_return",

  // Surveillance
  afpreported: "afp_reported",
  zerodoserecorded: "zero_dose_recorded",

  // Coverage metrics (NOTE: % suffix disambiguates from non-% variants)
  admincoverage: "admin_coverage",
  "admincoverage%": "admin_coverage_pct",
  "samedaymissedchildrencoverage%": "same_day_missed_pct",
  vaccineutilization: "vaccine_utilization",
  hhcoverage: "hh_coverage",
  "hhcoverage%": "hh_coverage_pct",

  // PMC / SMC
  coverednasmcofpreviouscampaign: "covered_na_smc_prev",
  "2roundpmccoverage": "round2_pmc",
  "3roundpmccoverage": "round3_pmc",

  // Refusals
  totalrefusal: "total_refusal",
  medicalrefusal: "medical_refusal",
  softrefusal: "soft_refusal",

  // MMP
  mmpregistration: "mmp_registration",
  mmpcoveredfromexistingregistration: "mmp_covered_existing",
  mmpmissedchildrenfromexisitingregistration: "mmp_missed_existing", // note: Excel typo "EXISITING"
  newlyarrivedmmpcovered: "mmp_newly_arrived_covered",
  shiftedmmp: "shifted_mmp",

  // Still missed (geographic breakdown)
  stillmissedchildrenwithinuc: "still_missed_in_uc",
  stillmissedchildrenoutofucwithintehsil: "still_missed_out_uc_tehsil",
  stillmissedchildrenoutoftehsilwithindistrict: "still_missed_out_tehsil_district",
  stillmissedchildrenoutofdistrict: "still_missed_out_district",
  stillmissedchildrenoutofprovince: "still_missed_out_province",
};

/**
 * Catch-up campaign (Day 4) — Excel header → DB column.
 */
export const CATCHUP_COLUMN_MAP: Record<string, string> = {
  // Identifiers
  tehsil: "tehsil",
  campaignname: "campaign_name",
  campaignday: "campaign_day",
  uc: "uc_name",
  ucname: "uc_name", // fallback

  // Target & covered missed children
  targetmissedchildrenna059: "target_missed_na",
  targetmissedchildrenref059: "target_missed_ref",
  coveredmissedchildrenna059: "covered_missed_na",
  coveredmissedchildrenref059: "covered_missed_ref",

  // Houses
  "00houses": "zero_zero_houses",
  lockedhouses: "locked_houses",

  // Vaccination
  guestvaccinated: "guest_vaccinated",
  unrecordedvaccinated: "unrecorded_vaccinated",
  mmpcoveredoncatchupday: "mmp_covered_catchup",
  persistentlymissedchildrenpmcrecorded: "pmc_recorded",

  // OPV
  opvgiven: "opv_issued",
  opvissued: "opv_issued", // alias — "OPV Issued" header (renamed from "OPV Given")
  opvused: "opv_used",
  opvreturned: "opv_returned",

  // Surveillance
  afpreported: "afp_reported",
  zerodoserecorded: "zero_dose_recorded",

  // Vitamin A
  vitabluegiven: "vita_blue_given",
  vitaredgiven: "vita_red_given",

  // Vaccination sites
  vaccinatedatfixsite: "vaccinated_fix_site",
  vaccinatedattransitsite: "vaccinated_transit",

  // Coverage
  totalcoverage: "total_coverage",
  "totalcoverage%": "total_coverage_pct",
  stillmissedchildren: "still_missed",

  // PMC / SMC
  coverednasmcofpreviouscampaign: "covered_na_smc_prev",
  "2roundpmccoverage": "round2_pmc",
  "3roundpmccoverage": "round3_pmc",

  // Refusals
  totalrefusal: "total_refusal",
  medicalrefusal: "medical_refusal",
  softrefusal: "soft_refusal",

  // MMP
  mmpregistration: "mmp_registration",
  mmpcoveredfromexistingregistration: "mmp_covered_existing",
  mmpmissedchildrenfromexisitingregistration: "mmp_missed_existing",
  newlyarrivedmmpcovered: "mmp_newly_arrived_covered",
  shiftedmmp: "shifted_mmp",

  // Still missed
  stillmissedchildrenwithinuc: "still_missed_in_uc",
  stillmissedchildrenoutofucwithintehsil: "still_missed_out_uc_tehsil",
  stillmissedchildrenoutoftehsilwithindistrict: "still_missed_out_tehsil_district",
  stillmissedchildrenoutofdistrict: "still_missed_out_district",
  stillmissedchildrenoutofprovince: "still_missed_out_province",
};

/** Required columns that MUST be present in a daily file. */
export const DAILY_REQUIRED = ["tehsil", "campaignname", "campaignday", "ucname", "uc"];

/** Required columns that MUST be present in a catchup file. */
export const CATCHUP_REQUIRED = ["tehsil", "campaignname", "campaignday", "uc", "ucname"];
