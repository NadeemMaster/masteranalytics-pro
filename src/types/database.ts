// ============================================================================
//  MasterAnalytics Pro — Database Types
//  Mirrors supabase/schema.sql. Provides type-safety for all Supabase queries.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ----------------------------------------------------------------------------
//  DAILY CAMPAIGN DATA (Days 1, 2, 3 — cumulative)
// ----------------------------------------------------------------------------
export interface DailyCampaignRow {
  id: string;
  user_id: string;
  campaign_name: string;
  campaign_day: 1 | 2 | 3;

  tehsil: string;
  uc_name: string;

  // Core targets & coverage
  over_all_target: number;
  teams_reported: number;
  houses_planned: number;
  houses_visited: number;
  target_hh_0_59: number;
  first_visit_hh_0_59: number;
  zero_zero_houses: number;
  locked_houses: number;

  // Vitamin A
  vita_6_11: number;
  vita_12_59: number;

  // Missed children
  missed_na_0_59: number;
  missed_ref_0_59: number;
  missed_covered_na: number;
  missed_covered_ref: number;

  // Vaccination sites
  vaccinated_school: number;
  guest_vaccinated: number;
  vaccinated_streets: number;
  mmp_vaccinated: number;
  vaccinated_fix_site: number;
  vaccinated_transit: number;

  // OPV / Finger markers
  finger_markers: number;
  opv_issued: number;
  opv_used: number;
  opv_returned: number;
  total_capsules_given: number;
  total_capsules_used: number;
  total_capsules_return: number;

  // Surveillance
  afp_reported: number;
  zero_dose_recorded: number;

  // Coverage metrics
  admin_coverage: number;
  admin_coverage_pct: number;
  same_day_missed_pct: number;
  vaccine_utilization: number;
  hh_coverage: number;
  hh_coverage_pct: number;

  // PMC / SMC
  covered_na_smc_prev: number;
  round2_pmc: number;
  round3_pmc: number;

  // Refusals
  total_refusal: number;
  medical_refusal: number;
  soft_refusal: number;

  // MMP
  mmp_registration: number;
  mmp_covered_existing: number;
  mmp_missed_existing: number;
  mmp_newly_arrived_covered: number;
  shifted_mmp: number;

  // Still missed
  still_missed_in_uc: number;
  still_missed_out_uc_tehsil: number;
  still_missed_out_tehsil_district: number;
  still_missed_out_district: number;
  still_missed_out_province: number;

  raw_data: Json | null;

  created_at: string;
  updated_at: string;
}

// Row shape accepted on insert.
// Fields with DB defaults (DEFAULT 0 / DEFAULT now()) are optional here,
// matching the Supabase Insert convention.
export type DailyCampaignInsert = {
  id?: string;
  user_id: string;
  campaign_name: string;
  campaign_day: 1 | 2 | 3;
  tehsil: string;
  uc_name: string;
  over_all_target?: number;
  teams_reported?: number;
  houses_planned?: number;
  houses_visited?: number;
  target_hh_0_59?: number;
  first_visit_hh_0_59?: number;
  zero_zero_houses?: number;
  locked_houses?: number;
  vita_6_11?: number;
  vita_12_59?: number;
  missed_na_0_59?: number;
  missed_ref_0_59?: number;
  missed_covered_na?: number;
  missed_covered_ref?: number;
  vaccinated_school?: number;
  guest_vaccinated?: number;
  vaccinated_streets?: number;
  mmp_vaccinated?: number;
  vaccinated_fix_site?: number;
  vaccinated_transit?: number;
  finger_markers?: number;
  opv_issued?: number;
  opv_used?: number;
  opv_returned?: number;
  total_capsules_given?: number;
  total_capsules_used?: number;
  total_capsules_return?: number;
  afp_reported?: number;
  zero_dose_recorded?: number;
  admin_coverage?: number;
  admin_coverage_pct?: number;
  same_day_missed_pct?: number;
  vaccine_utilization?: number;
  hh_coverage?: number;
  hh_coverage_pct?: number;
  covered_na_smc_prev?: number;
  round2_pmc?: number;
  round3_pmc?: number;
  total_refusal?: number;
  medical_refusal?: number;
  soft_refusal?: number;
  mmp_registration?: number;
  mmp_covered_existing?: number;
  mmp_missed_existing?: number;
  mmp_newly_arrived_covered?: number;
  shifted_mmp?: number;
  still_missed_in_uc?: number;
  still_missed_out_uc_tehsil?: number;
  still_missed_out_tehsil_district?: number;
  still_missed_out_district?: number;
  still_missed_out_province?: number;
  raw_data?: Json | null;
  created_at?: string;
  updated_at?: string;
};

// Row shape accepted on update
export type DailyCampaignUpdate = Partial<DailyCampaignInsert>;

// ----------------------------------------------------------------------------
//  CATCH-UP CAMPAIGN DATA (Day 4 only)
// ----------------------------------------------------------------------------
export interface CatchupCampaignRow {
  id: string;
  user_id: string;
  campaign_name: string;
  campaign_day: 4;

  tehsil: string;
  uc_name: string;

  // Target & covered missed children
  target_missed_na: number;
  target_missed_ref: number;
  covered_missed_na: number;
  covered_missed_ref: number;
  target_missed_total: number; // generated column
  covered_missed_total: number; // generated column

  // Houses
  zero_zero_houses: number;
  locked_houses: number;

  // Vaccination
  guest_vaccinated: number;
  unrecorded_vaccinated: number;
  mmp_covered_catchup: number;
  pmc_recorded: number;

  // OPV
  opv_issued: number;
  opv_used: number;
  opv_returned: number;

  // Surveillance
  afp_reported: number;
  zero_dose_recorded: number;

  // Vitamin A
  vita_blue_given: number;
  vita_red_given: number;

  // Vaccination sites
  vaccinated_fix_site: number;
  vaccinated_transit: number;

  // Coverage
  total_coverage: number;
  total_coverage_pct: number;
  still_missed: number;

  // PMC / SMC
  covered_na_smc_prev: number;
  round2_pmc: number;
  round3_pmc: number;

  // Refusals
  total_refusal: number;
  medical_refusal: number;
  soft_refusal: number;

  // MMP
  mmp_registration: number;
  mmp_covered_existing: number;
  mmp_missed_existing: number;
  mmp_newly_arrived_covered: number;
  shifted_mmp: number;

  // Still missed
  still_missed_in_uc: number;
  still_missed_out_uc_tehsil: number;
  still_missed_out_tehsil_district: number;
  still_missed_out_district: number;
  still_missed_out_province: number;

  raw_data: Json | null;

  created_at: string;
  updated_at: string;
}

export type CatchupCampaignInsert = {
  id?: string;
  user_id: string;
  campaign_name: string;
  campaign_day?: 4; // has DEFAULT 4
  tehsil: string;
  uc_name: string;
  target_missed_na?: number;
  target_missed_ref?: number;
  covered_missed_na?: number;
  covered_missed_ref?: number;
  // target_missed_total & covered_missed_total are GENERATED — never insert
  zero_zero_houses?: number;
  locked_houses?: number;
  guest_vaccinated?: number;
  unrecorded_vaccinated?: number;
  mmp_covered_catchup?: number;
  pmc_recorded?: number;
  opv_issued?: number;
  opv_used?: number;
  opv_returned?: number;
  afp_reported?: number;
  zero_dose_recorded?: number;
  vita_blue_given?: number;
  vita_red_given?: number;
  vaccinated_fix_site?: number;
  vaccinated_transit?: number;
  total_coverage?: number;
  total_coverage_pct?: number;
  still_missed?: number;
  covered_na_smc_prev?: number;
  round2_pmc?: number;
  round3_pmc?: number;
  total_refusal?: number;
  medical_refusal?: number;
  soft_refusal?: number;
  mmp_registration?: number;
  mmp_covered_existing?: number;
  mmp_missed_existing?: number;
  mmp_newly_arrived_covered?: number;
  shifted_mmp?: number;
  still_missed_in_uc?: number;
  still_missed_out_uc_tehsil?: number;
  still_missed_out_tehsil_district?: number;
  still_missed_out_district?: number;
  still_missed_out_province?: number;
  raw_data?: Json | null;
  created_at?: string;
  updated_at?: string;
};

export type CatchupCampaignUpdate = Partial<CatchupCampaignInsert>;

// ----------------------------------------------------------------------------
//  Database schema (for Supabase generic typing)
//  NOTE: Supabase's GenericTable requires a `Relationships` array on every
//  table (empty if no foreign keys). Without it, the type resolves to `never`
//  and .upsert()/.insert()/.update() reject all inputs.
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      daily_campaign_data: {
        Row: DailyCampaignRow;
        Insert: DailyCampaignInsert;
        Update: DailyCampaignUpdate;
        Relationships: [];
      };
      catchup_campaign_data: {
        Row: CatchupCampaignRow;
        Insert: CatchupCampaignInsert;
        Update: CatchupCampaignUpdate;
        Relationships: [];
      };
    };
    Views: {
      v_daily_latest: {
        Row: {
          user_id: string;
          campaign_name: string;
          tehsil: string;
          uc_name: string;
          campaign_day: number;
          over_all_target: number;
          teams_reported: number;
          houses_planned: number;
          houses_visited: number;
          opv_issued: number;
          missed_na_0_59: number;
          total_refusal: number;
          admin_coverage_pct: number;
          hh_coverage_pct: number;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
      v_uc_summary: {
        Row: {
          user_id: string;
          campaign_name: string;
          tehsil: string;
          uc_name: string;
          latest_day: number;
          over_all_target: number;
          teams_reported: number;
          opv_issued: number;
          missed_na_0_59: number;
          total_refusal: number;
          admin_coverage_pct: number;
          day4_target_missed: number;
          day4_covered_missed: number;
          day4_total_coverage: number;
          day4_still_missed: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      handle_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience aliases
export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;
