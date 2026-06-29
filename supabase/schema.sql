-- ============================================================================
--  MasterAnalytics Pro — Polio Campaign Dashboard
--  Supabase SQL Schema + Row Level Security (RLS) Policies
--
--  How to use:
--    1. Open Supabase Dashboard → SQL Editor → New Query
--    2. Paste this entire file
--    3. Click "Run"
--
--  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()


-- ============================================================================
-- 1. DAILY CAMPAIGN DATA  (Days 1, 2, 3 — cumulative, replaces previous day)
-- ============================================================================

-- Drop in dev (safe — comment out in production if you don't want data loss)
drop table if exists public.daily_campaign_data cascade;

create table public.daily_campaign_data (
    -- Primary identifiers --------------------------------------------------
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    campaign_name       text not null,
    campaign_day        smallint not null check (campaign_day in (1, 2, 3)),

    -- Geography ------------------------------------------------------------
    tehsil              text not null,
    uc_name             text not null,

    -- Core targets & coverage ---------------------------------------------
    over_all_target     integer not null default 0,
    teams_reported      integer not null default 0,
    houses_planned      integer not null default 0,
    houses_visited      integer not null default 0,
    target_hh_0_59      integer not null default 0,
    first_visit_hh_0_59 integer not null default 0,
    zero_zero_houses    integer not null default 0,
    locked_houses       integer not null default 0,

    -- Vitamin A -----------------------------------------------------------
    vita_6_11           integer not null default 0,
    vita_12_59          integer not null default 0,

    -- Missed children (recorded vs covered) -------------------------------
    missed_na_0_59      integer not null default 0,    -- MISSED CHILDREN RECORDED NA 0-59
    missed_ref_0_59     integer not null default 0,    -- MISSED CHILDREN RECORDED Ref 0-59
    missed_covered_na   integer not null default 0,
    missed_covered_ref  integer not null default 0,

    -- Vaccination sites ---------------------------------------------------
    vaccinated_school   integer not null default 0,
    guest_vaccinated    integer not null default 0,
    vaccinated_streets  integer not null default 0,
    mmp_vaccinated      integer not null default 0,
    vaccinated_fix_site integer not null default 0,
    vaccinated_transit  integer not null default 0,

    -- OPV / Finger markers ------------------------------------------------
    finger_markers      integer not null default 0,
    opv_issued          integer not null default 0,
    opv_used            integer not null default 0,
    opv_returned        integer not null default 0,
    total_capsules_given  integer not null default 0,
    total_capsules_used   integer not null default 0,
    total_capsules_return integer not null default 0,

    -- Surveillance --------------------------------------------------------
    afp_reported        integer not null default 0,
    zero_dose_recorded  integer not null default 0,

    -- Coverage metrics (percentages stored as 0-1 floats) -----------------
    admin_coverage      double precision not null default 0,
    admin_coverage_pct  double precision not null default 0,
    same_day_missed_pct double precision not null default 0,
    vaccine_utilization double precision not null default 0,
    hh_coverage         integer not null default 0,
    hh_coverage_pct     double precision not null default 0,

    -- PMC / SMC -----------------------------------------------------------
    covered_na_smc_prev integer not null default 0,
    round2_pmc          integer not null default 0,
    round3_pmc          integer not null default 0,

    -- Refusals ------------------------------------------------------------
    total_refusal       integer not null default 0,
    medical_refusal     integer not null default 0,
    soft_refusal        integer not null default 0,

    -- MMP -----------------------------------------------------------------
    mmp_registration         integer not null default 0,
    mmp_covered_existing     integer not null default 0,
    mmp_missed_existing      integer not null default 0,
    mmp_newly_arrived_covered integer not null default 0,
    shifted_mmp              integer not null default 0,

    -- Still missed (geographic breakdown) ---------------------------------
    still_missed_in_uc        integer not null default 0,
    still_missed_out_uc_tehsil integer not null default 0,
    still_missed_out_tehsil_district integer not null default 0,
    still_missed_out_district  integer not null default 0,
    still_missed_out_province  integer not null default 0,

    -- Full original row (for any column not explicitly typed above)
    raw_data            jsonb,

    -- Timestamps ----------------------------------------------------------
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Unique constraint: ONE row per (user, campaign, tehsil, uc)
-- This enforces the "Day 2 replaces Day 1" rule via upsert ON CONFLICT.
alter table public.daily_campaign_data
    add constraint daily_uc_unique
    unique (user_id, campaign_name, tehsil, uc_name);

-- Indexes for fast filtering
create index idx_daily_user        on public.daily_campaign_data(user_id);
create index idx_daily_campaign    on public.daily_campaign_data(campaign_name);
create index idx_daily_tehsil      on public.daily_campaign_data(tehsil);
create index idx_daily_uc          on public.daily_campaign_data(uc_name);
create index idx_daily_day         on public.daily_campaign_data(campaign_day);
create index idx_daily_created_at  on public.daily_campaign_data(created_at desc);


-- ============================================================================
-- 2. CATCH-UP CAMPAIGN DATA  (Day 4 only)
-- ============================================================================

drop table if exists public.catchup_campaign_data cascade;

create table public.catchup_campaign_data (
    -- Primary identifiers --------------------------------------------------
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    campaign_name       text not null,
    campaign_day        smallint not null default 4 check (campaign_day = 4),

    -- Geography ------------------------------------------------------------
    tehsil              text not null,
    uc_name             text not null,

    -- Target & covered missed children ------------------------------------
    target_missed_na    integer not null default 0,    -- Target MISSED CHILDREN NA 0-59
    target_missed_ref   integer not null default 0,    -- Target MISSED CHILDREN Ref 0-59
    covered_missed_na   integer not null default 0,    -- covered MISSED CHILDREN NA 0-59
    covered_missed_ref  integer not null default 0,    -- covered MISSED CHILDREN Ref 0-59
    target_missed_total integer generated always as (target_missed_na + target_missed_ref) stored,
    covered_missed_total integer generated always as (covered_missed_na + covered_missed_ref) stored,

    -- Houses --------------------------------------------------------------
    zero_zero_houses    integer not null default 0,
    locked_houses       integer not null default 0,

    -- Vaccination ---------------------------------------------------------
    guest_vaccinated        integer not null default 0,
    unrecorded_vaccinated   integer not null default 0,
    mmp_covered_catchup     integer not null default 0,
    pmc_recorded            integer not null default 0,

    -- OPV -----------------------------------------------------------------
    opv_issued          integer not null default 0,
    opv_used            integer not null default 0,
    opv_returned        integer not null default 0,

    -- Surveillance --------------------------------------------------------
    afp_reported        integer not null default 0,
    zero_dose_recorded  integer not null default 0,

    -- Vitamin A -----------------------------------------------------------
    vita_blue_given     integer not null default 0,
    vita_red_given      integer not null default 0,

    -- Vaccination sites ---------------------------------------------------
    vaccinated_fix_site integer not null default 0,
    vaccinated_transit  integer not null default 0,

    -- Coverage ------------------------------------------------------------
    total_coverage      integer not null default 0,
    total_coverage_pct  double precision not null default 0,
    still_missed        integer not null default 0,

    -- PMC / SMC -----------------------------------------------------------
    covered_na_smc_prev integer not null default 0,
    round2_pmc          integer not null default 0,
    round3_pmc          integer not null default 0,

    -- Refusals ------------------------------------------------------------
    total_refusal       integer not null default 0,
    medical_refusal     integer not null default 0,
    soft_refusal        integer not null default 0,

    -- MMP -----------------------------------------------------------------
    mmp_registration         integer not null default 0,
    mmp_covered_existing     integer not null default 0,
    mmp_missed_existing      integer not null default 0,
    mmp_newly_arrived_covered integer not null default 0,
    shifted_mmp              integer not null default 0,

    -- Still missed (geographic breakdown) ---------------------------------
    still_missed_in_uc        integer not null default 0,
    still_missed_out_uc_tehsil integer not null default 0,
    still_missed_out_tehsil_district integer not null default 0,
    still_missed_out_district  integer not null default 0,
    still_missed_out_province  integer not null default 0,

    -- Full original row (for any column not explicitly typed above)
    raw_data            jsonb,

    -- Timestamps ----------------------------------------------------------
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Unique constraint: ONE Day-4 row per (user, campaign, tehsil, uc)
alter table public.catchup_campaign_data
    add constraint catchup_uc_unique
    unique (user_id, campaign_name, tehsil, uc_name);

-- Indexes
create index idx_catchup_user       on public.catchup_campaign_data(user_id);
create index idx_catchup_campaign   on public.catchup_campaign_data(campaign_name);
create index idx_catchup_tehsil     on public.catchup_campaign_data(tehsil);
create index idx_catchup_uc         on public.catchup_campaign_data(uc_name);
create index idx_catchup_created_at on public.catchup_campaign_data(created_at desc);


-- ============================================================================
-- 3. UPDATED_AT TRIGGERS  (auto-maintain updated_at on every UPDATE)
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_daily_updated_at on public.daily_campaign_data;
create trigger trg_daily_updated_at
    before update on public.daily_campaign_data
    for each row execute function public.handle_updated_at();

drop trigger if exists trg_catchup_updated_at on public.catchup_campaign_data;
create trigger trg_catchup_updated_at
    before update on public.catchup_campaign_data
    for each row execute function public.handle_updated_at();


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
--    Every user sees ONLY their own rows (auth.uid() = user_id).
-- ============================================================================

-- Enable RLS on both tables
alter table public.daily_campaign_data   enable row level security;
alter table public.catchup_campaign_data enable row level security;

-- ---- DAILY CAMPAIGN DATA policies ----
drop policy if exists "daily_select_own"  on public.daily_campaign_data;
drop policy if exists "daily_insert_own"  on public.daily_campaign_data;
drop policy if exists "daily_update_own"  on public.daily_campaign_data;
drop policy if exists "daily_delete_own"  on public.daily_campaign_data;

create policy "daily_select_own"
    on public.daily_campaign_data for select
    to authenticated
    using (auth.uid() = user_id);

create policy "daily_insert_own"
    on public.daily_campaign_data for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "daily_update_own"
    on public.daily_campaign_data for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "daily_delete_own"
    on public.daily_campaign_data for delete
    to authenticated
    using (auth.uid() = user_id);

-- ---- CATCH-UP CAMPAIGN DATA policies ----
drop policy if exists "catchup_select_own" on public.catchup_campaign_data;
drop policy if exists "catchup_insert_own" on public.catchup_campaign_data;
drop policy if exists "catchup_update_own" on public.catchup_campaign_data;
drop policy if exists "catchup_delete_own" on public.catchup_campaign_data;

create policy "catchup_select_own"
    on public.catchup_campaign_data for select
    to authenticated
    using (auth.uid() = user_id);

create policy "catchup_insert_own"
    on public.catchup_campaign_data for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "catchup_update_own"
    on public.catchup_campaign_data for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "catchup_delete_own"
    on public.catchup_campaign_data for delete
    to authenticated
    using (auth.uid() = user_id);


-- ============================================================================
-- 5. HELPER VIEWS (optional, convenient for dashboards)
-- ============================================================================

-- Latest day snapshot for daily data (the most recent campaign_day per UC)
create or replace view public.v_daily_latest as
select distinct on (user_id, campaign_name, tehsil, uc_name)
       user_id, campaign_name, tehsil, uc_name,
       campaign_day, over_all_target, teams_reported,
       houses_planned, houses_visited, opv_issued,
       missed_na_0_59, total_refusal, admin_coverage_pct,
       hh_coverage_pct, created_at, updated_at
from public.daily_campaign_data
order by user_id, campaign_name, tehsil, uc_name, campaign_day desc;

-- Combined daily + catchup per UC (one row per UC for a campaign)
create or replace view public.v_uc_summary as
select d.user_id, d.campaign_name, d.tehsil, d.uc_name,
       max(d.campaign_day) as latest_day,
       d.over_all_target,
       d.teams_reported,
       d.opv_issued,
       d.missed_na_0_59,
       d.total_refusal,
       d.admin_coverage_pct,
       coalesce(c.target_missed_total, 0) as day4_target_missed,
       coalesce(c.covered_missed_total, 0) as day4_covered_missed,
       coalesce(c.total_coverage, 0) as day4_total_coverage,
       coalesce(c.still_missed, 0) as day4_still_missed
from public.daily_campaign_data d
left join public.catchup_campaign_data c
       on c.user_id = d.user_id
      and c.campaign_name = d.campaign_name
      and c.tehsil = d.tehsil
      and c.uc_name = d.uc_name
group by d.user_id, d.campaign_name, d.tehsil, d.uc_name,
         d.over_all_target, d.teams_reported, d.opv_issued,
         d.missed_na_0_59, d.total_refusal, d.admin_coverage_pct,
         c.target_missed_total, c.covered_missed_total,
         c.total_coverage, c.still_missed;


-- ============================================================================
-- 6. DONE — verify with:
--    select count(*) from public.daily_campaign_data;
--    select count(*) from public.catchup_campaign_data;
--    select * from pg_policies where tablename in ('daily_campaign_data','catchup_campaign_data');
-- ============================================================================
