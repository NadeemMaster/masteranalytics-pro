# Polio Campaign Dashboard — Worklog

Shared work record across all steps and agents.

---
Task ID: 1
Agent: main (Super Z)
Task: Step 1 — Install dependencies & setup `.env.local` template

Work Log:
- Inspected uploaded Excel files (`sia_daily_report_day_1.xlsx` = 55 cols, Days 1-3; `sia_catchup_report_day_4.xlsx` = 42 cols, Day 4) to inform upcoming schema design.
- Scaffolded Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v3 project from scratch (workspace had no prior project).
- Created config files: `package.json`, `next.config.mjs` (serverActions bodySizeLimit 10mb for uploads), `tsconfig.json` (path alias `@/*`, excluded skills/upload/download), `tailwind.config.ts` (shadcn theme + chart colors), `postcss.config.mjs`, `components.json` (shadcn), `eslint.config.mjs`, `.gitignore`.
- Installed 484 packages via `bun install`: next 15.1.6, react 19, @supabase/supabase-js ^2, @supabase/ssr ^0.5, groq-sdk ^0.7, xlsx 0.20.3 (sheetjs CDN), recharts ^2.15, lucide-react, shadcn primitives (radix-ui slot/label/select/dialog/dropdown/tabs/separator/avatar/progress/tooltip), class-variance-authority, clsx, tailwind-merge, tailwindcss-animate, sonner.
- Trusted `unrs-resolver` postinstall (eslint dep).
- Created base app: `src/app/layout.tsx` (Inter font + Sonner Toaster), `src/app/page.tsx` (landing/progress page), `src/app/globals.css` (shadcn CSS variables light+dark).
- Created shadcn UI primitives: `button`, `card`, `input`, `label`, `sonner` (light theme — next-themes not installed yet).
- Created `src/lib/utils.ts` with `cn()` + data-cleaning helpers (`toNumber`, `toNullableNumber`, `toCleanString`, `formatNumber`, `formatPercent`) — these implement the `*`/empty/NA → 0|null cleaning logic required for Step 5.
- Created `.env.example` and `.env.local` template with: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, GROQ_MODEL.
- Verified: `bun run lint` → ✔ No ESLint warnings or errors; `bunx tsc --noEmit` → exit 0.

Stage Summary:
- Project fully initialized and type-checks + lints clean.
- All 7 required dependency groups installed (supabase, xlsx, groq-sdk, recharts, lucide-react, shadcn primitives, plus dev tooling).
- `.env.local` template ready for user to fill Supabase + Groq credentials.
- Data-cleaning utilities already in place (will be reused in Step 5 upload route).
- Discovered real Excel column structure (55 daily cols, 42 catchup cols) — schema in Step 2 will mirror the user's stated subset plus store full raw row JSON for flexibility.
- Awaiting user confirmation to proceed to Step 2 (SQL schema + RLS policies).

---
Task ID: 2
Agent: main (Super Z)
Task: Step 2 — Write SQL schema for both tables with RLS policies + rename app to MasterAnalytics Pro + add credits footer

Work Log:
- Renamed app: `package.json` name → `masteranalytics-pro`.
- Updated `src/app/layout.tsx`: metadata title → "MasterAnalytics Pro — Polio Campaign Dashboard", added authors metadata (M. Nadeem Akhtar + Facebook URL), added global footer with "MasterAnalytics Pro" branding and "Developed by M. Nadeem Akhtar" backlink to https://www.facebook.com/itxmasterjee (opens in new tab, noopener).
- Updated `src/app/page.tsx`: heading "MasterAnalytics Pro", added "Next Action — Run the SQL in Supabase" instructions card, marked Step 2 as complete in progress tracker.
- Wrote complete SQL schema at `/home/z/my-project/supabase/schema.sql` (and copied to `/home/z/my-project/download/schema.sql` for download).
- Schema details:
  * `daily_campaign_data` table (Days 1-3): 50+ typed columns covering ALL KPI columns from the actual day-1 Excel (over_all_target, teams_reported, houses_planned/visited, target_hh_0_59, missed children NA/Ref recorded+covered, OPV given/used/returned, refusals total/medical/soft, PMC rounds, MMP fields, still-missed geographic breakdown) + `raw_data` JSONB to preserve the complete original row.
  * `catchup_campaign_data` table (Day 4 only): 40+ typed columns from the day-4 Excel (target_missed_na/ref, covered_missed_na/ref, total_coverage, still_missed, refusals, MMP, vitamin A) + generated columns `target_missed_total` & `covered_missed_total` (sum of NA+Ref) + `raw_data` JSONB.
  * UNIQUE constraint `(user_id, campaign_name, tehsil, uc_name)` on BOTH tables — this enforces the critical "Day 2 replaces Day 1" rule via upsert ON CONFLICT (no campaign_day in the unique key, so latest upload wins).
  * CHECK constraint: `campaign_day in (1,2,3)` for daily, `campaign_day = 4` for catchup.
  * Indexes on user_id, campaign_name, tehsil, uc_name, campaign_day, created_at for fast filtering.
  * `handle_updated_at()` trigger function + triggers on both tables to auto-maintain updated_at.
  * RLS enabled on both tables with 4 policies each (SELECT/INSERT/UPDATE/DELETE) restricted to `auth.uid() = user_id` for `authenticated` role.
  * Two helper views: `v_daily_latest` (latest day per UC) and `v_uc_summary` (combined daily + catchup per UC).
- Verified: `bun run lint` → ✔ clean; `bunx tsc --noEmit` → exit 0.

Stage Summary:
- App renamed to "MasterAnalytics Pro" with credits footer (M. Nadeem Akhtar → Facebook).
- Production-ready SQL schema (schema.sql) ready to paste into Supabase SQL Editor.
- RLS guarantees data isolation: users can only SELECT/INSERT/UPDATE/DELETE their own rows.
- Unique constraints enable clean upsert logic for cumulative Day 1-3 data (Step 5 will use ON CONFLICT).
- Generated columns + helper views reduce aggregation logic needed in Step 6.
- User asked about Vercel hosting + file access — explained in chat (git push → Vercel import; files at /home/z/my-project/, downloads at /home/z/my-project/download/).
- Awaiting user confirmation to proceed to Step 3 (Supabase client utilities).

---
Task ID: 3
Agent: main (Super Z)
Task: Step 3 — Generate Supabase client utility files (browser, server, middleware, types)

Work Log:
- Created `src/types/database.ts` with full TypeScript types matching `supabase/schema.sql`:
  * `DailyCampaignRow` (50+ typed fields), `DailyCampaignInsert`, `DailyCampaignUpdate`
  * `CatchupCampaignRow` (40+ typed fields), `CatchupCampaignInsert`, `CatchupCampaignUpdate`
  * `Database` interface for Supabase generic typing (Tables + Views: v_daily_latest, v_uc_summary + Functions)
  * `SupabaseClient` type alias for `SupabaseClient<Database>`
- Created `src/lib/supabase/client.ts` — browser client via `createBrowserClient` from @supabase/ssr:
  * Singleton pattern (avoids re-creating on every render)
  * PKCE auth flow, persistSession, autoRefreshToken, detectSessionInUrl
  * Throws clear error if NEXT_PUBLIC env vars missing
- Created `src/lib/supabase/server.ts` — server client via `createServerClient`:
  * Uses `cookies()` from next/headers (async in Next.js 15 — caller must `await createClient()`)
  * `setAll` wrapped in try/catch (Server Components can't set cookies — middleware handles refresh)
  * Added `getUser()` and `requireUser()` convenience helpers (requireUser redirects to /login if unauthenticated)
- Created `src/lib/supabase/middleware.ts` — `updateSession()` helper:
  * Refreshes auth session on every request (writes updated cookies)
  * Uses `getUser()` (not `getSession()`) for security — validates against server
  * Protects routes: /dashboard, /upload, /reports, /settings → redirect to /login?redirect=... if unauthenticated
  * Redirects authenticated users away from /login and /signup → /dashboard
- Created `src/middleware.ts` — Next.js middleware entry point:
  * Delegates to `updateSession()`
  * Matcher excludes static assets, image files, and CSS/JS
- Created `src/lib/env.ts` — env var validation:
  * `env` object with validated values (throws at startup if NEXT_PUBLIC vars missing or still placeholder)
  * `isConfigured` boolean flag for conditional UI banners
- Fixed TypeScript implicit-any errors in `setAll` callbacks by importing `CookieOptions` from @supabase/ssr and adding explicit `CookieSetItem[]` param types.
- Verified: `bun run lint` → ✔ No ESLint warnings or errors; `bunx tsc --noEmit` → exit 0.
- Updated `src/app/page.tsx` progress tracker (Step 3 marked complete).
- Refreshed `download/masteranalytics-pro.zip` (86 KB) with all Step 3 files.
- Committed: "Step 3: Supabase client utilities (browser, server, middleware, types, env guard)".

Stage Summary:
- Type-safe Supabase layer complete — all queries now get autocomplete on table/column names via `Database` generic.
- Browser client (singleton) + server client (async) + middleware (session refresh + route guard) follow the official @supabase/ssr pattern for Next.js App Router.
- RLS-friendly: server client reads the user's cookies so RLS policies (`auth.uid() = user_id`) apply to all queries automatically.
- Route protection active: unauthenticated users can't reach /dashboard; authenticated users skip /login.
- Awaiting user confirmation to proceed to Step 4 (Authentication UI + Auth callback route).

---
Task ID: 4
Agent: main (Super Z)
Task: Step 4 — Create Authentication UI (login/signup) + Auth callback route + logout

Work Log:
- Created 3 new shadcn UI primitives: `separator.tsx`, `dropdown-menu.tsx` (full menu suite), `avatar.tsx`.
- Created `src/components/ui/password-input.tsx`:
  * `PasswordInput` component with show/hide toggle (Eye / EyeOff icons)
  * `evaluatePasswordStrength()` + `PasswordStrengthBar` — 4-segment strength meter (Too short/Weak/Fair/Good/Strong)
- Created `/login` route (Server Component shell + Client Component form):
  * `src/app/login/page.tsx` — branded shell with MasterAnalytics Pro logo, RLS trust banner, Suspense wrapper for `useSearchParams`
  * `src/app/login/login-form.tsx` — email/password sign-in via Supabase browser client
    - Friendly error mapping (invalid credentials, email not confirmed, rate limit)
    - Reads `?redirect=` param (validated to relative path) for post-login navigation
    - Reads `?error=auth_callback|config` to surface auth-callback / config errors as toasts
    - `router.push + router.refresh` to force middleware + Server Components to pick up new session
    - Loading state, disabled inputs, Sonner toasts
- Created `/signup` route (Server Component shell + Client Component form):
  * `src/app/signup/page.tsx` — same branded shell
  * `src/app/signup/signup-form.tsx` — email/password + confirm password
    - Email regex validation, min 8 chars password, password match check, inline strength bar
    - Maps "already registered" / "password too weak" / "rate limit" errors
    - Two-path success: auto-sign-in (email confirmation OFF) → /dashboard, or "check your email" state (email confirmation ON)
- Created `/auth/callback` route (`src/app/auth/callback/route.ts`):
  * Handles PKCE email-confirmation redirect from Supabase
  * Reads `code` param, exchanges for session via `supabase.auth.exchangeCodeForSession(code)`
  * Builds redirect response FIRST so Supabase writes session cookies to the response
  * Validates `next` param to relative path (prevents open-redirect)
  * Error path → redirects to /login?error=auth_callback
- Created `src/app/actions.ts` — `logout` Server Action:
  * `supabase.auth.signOut()` + `revalidatePath('/', 'layout')` + `redirect('/login')`
- Created `src/components/user-menu.tsx`:
  * Avatar dropdown for dashboard header — shows email initials, signed-in-as label, "Sign out" item (calls logout action via useTransition)
  * Disabled "Profile" item placeholder
- Created `/dashboard` placeholder page (`src/app/dashboard/page.tsx`):
  * Calls `requireUser()` (redirects to /login if not signed in)
  * Renders branded header with UserMenu
  * Welcome banner + Step 5/6/7/8 status grid + "ready to upload" CTA
  * This page will be replaced by the full dashboard in Step 6
- Fixed lint/type issues: empty interface → type alias (password-input), removed unused `searchParams` from LoginPage (deferred to client form via useSearchParams), added `CookieSetItem[]` param type to auth callback `setAll`.
- Verified: `bun run lint` → ✔ No ESLint warnings or errors; `bunx tsc --noEmit` → exit 0.
- Refreshed `download/masteranalytics-pro.zip` (104 KB) with all Step 4 files.
- Committed: "Step 4: Authentication UI (login/signup) + auth callback + logout + UserMenu + dashboard placeholder".

Stage Summary:
- Complete auth flow: signup → email confirmation (if enabled) → /auth/callback → session set → /dashboard.
- Login flow: credentials → session → /dashboard (or original ?redirect path).
- Logout: Server Action clears session + redirects to /login.
- Middleware (Step 3) protects /dashboard, /upload, /reports, /settings — unauthenticated → /login?redirect=...; authenticated user on /login|/signup → /dashboard.
- All auth errors mapped to friendly Sonner toasts.
- Password strength meter + show/hide toggle for better UX.
- /dashboard placeholder ensures post-login redirect doesn't 404 — will be replaced by full dashboard in Step 6.
- Next: Step 5 — File Upload UI + /api/upload route with `*`/empty/NA → 0 cleaning logic + cumulative Day 1-3 upsert (Day 2 replaces Day 1 for same UC).

---
Task ID: 5
Agent: main (Super Z)
Task: Step 5 — File Upload UI + /api/upload route with * cleaning logic + cumulative-replace upsert

Work Log:
- Re-inspected both Excel files to extract exact column names (55 daily, 42 catchup). Documented tricky cases: "Over all \nTarget" (newline), "Admin Coverage" vs "Admin Coverage %" (need % disambiguation), "MMP Registration:" (trailing colon), "0/0 Houses" (special chars), "UC name" (daily) vs "UC" (catchup), "MMP missed children FROM EXISITING REGISTRATION:" (Excel typo preserved).
- Created `src/lib/excel/normalize.ts`:
  * `normalizeHeader()` — lowercases, strips ALL whitespace (handles newlines), removes every char except word chars + % (preserves % for disambiguation)
  * `buildHeaderIndex()` — builds Map<normalizedHeader, columnIndex> for O(1) lookup
- Created `src/lib/excel/column-maps.ts`:
  * `DAILY_COLUMN_MAP` (50 entries) — normalized Excel header → DB column for all 50 daily fields
  * `CATCHUP_COLUMN_MAP` (40 entries) — normalized Excel header → DB column for all 40 catchup fields
  * `DAILY_REQUIRED` / `CATCHUP_REQUIRED` — minimum columns that must be present
- Created `src/lib/excel/parser.ts` — core parsing engine:
  * `parseExcelFile(fileBuffer, fileName)` → `ParseSummary`
  * Reads via SheetJS (XLSX.read with type:"array"), prefers "lqp" sheet name
  * Reads `Campaign Day` column FIRST to route rows → daily (Days 1-3) or catchup (Day 4)
  * `mapRow()` applies `toCleanString` for string fields (tehsil, uc_name, campaign_name), `toNumber` for numeric fields (treats *, empty, NA, N/A, - as 0), preserves `raw_data` JSONB with original cell values
  * Validates required identifier fields (tehsil, campaign_name, uc_name) — rows missing these go to errors[]
  * Returns: dailyRows[], catchupRows[], skipped[] (missing day / unexpected day), errors[] (missing required fields), unmappedHeaders[] (diagnostics)
- Created `src/app/api/upload/route.ts` — POST handler:
  * Authenticates via `getUser()` — 401 if not signed in
  * Validates: multipart form data, file present, .xlsx/.xls extension, ≤10MB
  * Reads ArrayBuffer, calls `parseExcelFile()`
  * Upserts daily rows with `onConflict: 'user_id,campaign_name,tehsil,uc_name'` — this ENFORCES the cumulative-replace rule (Day 2 REPLACES Day 1 for same UC because campaign_day is NOT in the conflict key)
  * Upserts catchup rows with same conflict pattern
  * user_id injected from session (never from request body — RLS validates)
  * Returns structured JSON: { success, fileName, sheetName, totalRows, daily: {parsed, upserted, error}, catchup: {...}, skipped[], rowErrors[], unmappedHeaders[], message }
  * HTTP 207 on partial errors, 200 on full success
- Created `src/components/ui/badge.tsx` — shadcn Badge with success/warning/info variants.
- Created `/upload` page (`src/app/upload/page.tsx`) — Server Component shell with branded header, breadcrumb, info banner explaining cumulative-replace + * → 0 cleaning.
- Created `src/app/upload/upload-form.tsx` — Client Component:
  * Drag-and-drop zone + click-to-browse (hidden file input)
  * File validation (extension, size) with toast errors
  * Upload progress bar (10% → 30% → 80% → 100%)
  * Results card: success/warning color-coded, 4-stat grid (total rows / daily upserted / catchup upserted / skipped+errors), table-level error display, unmapped headers as badges
  * Skipped rows table (Excel row # + reason) — max height 64 with scroll
  * Error rows table (same format)
  * "Upload another" + "Go to Dashboard" buttons
- Updated `/dashboard` placeholder: Step 5 card now shows "Ready" (green), CTA button links to /upload (was disabled).
- Updated landing page progress tracker (Step 5 marked complete).
- Fixed Supabase generic type resolution issue:
  * Added `Relationships: []` to every table + view in `Database` interface (required by GenericTable/GenericView constraint)
  * Added `CompositeTypes: Record<string, never>` to schema (required by GenericSchema)
  * Refactored `DailyCampaignInsert` and `CatchupCampaignInsert` from `Omit<Row, ...>` to explicit object types with optional fields (matching Supabase Insert convention — fields with DB defaults are optional)
  * Applied `as never` cast at upsert boundary (pragmatic workaround for @supabase/ssr generic resolution; data remains type-safe at parser level)
- Verified: `bun run lint` → ✔ No ESLint warnings or errors; `bunx tsc --noEmit` → exit 0.
- Refreshed `download/masteranalytics-pro.zip` (121 KB) with all Step 5 files.
- Committed: "Step 5: Excel parser + /api/upload route + /upload UI (drag-drop, per-row status, cumulative-replace upsert)".

Stage Summary:
- Complete upload pipeline: .xlsx → SheetJS parse → header normalization → value cleaning (* → 0) → typed DB rows → Supabase upsert with cumulative-replace.
- Critical logic enforced: Day 2 upload REPLACES Day 1 for same UC (unique constraint excludes campaign_day, upsert overwrites all columns).
- Day 4 rows auto-routed to catchup_campaign_data table.
- Full traceability: raw_data JSONB preserves original cell values; unmappedHeaders reported; skipped/error rows listed with Excel row numbers.
- RLS-safe: user_id from session, never from request.
- User can now sign up → log in → upload Day 1-4 Excel files → data lands in correct tables.
- Next: Step 6 — Dashboard UI with Filters, KPI Cards, Recharts charts.

---
Task ID: 6
Agent: full-stack-developer
Task: Step 6 — Dashboard UI with Filters, KPI Cards & Recharts

Work Log:
- Read worklog.md to confirm Steps 1-5 infrastructure (Supabase clients, types, RLS, upload pipeline, landing page credits). Inspected existing UI primitives (button/card/badge/avatar/dropdown-menu/separator/input/label/sonner/password-input) and `src/types/database.ts` to align with existing conventions.
- Created 5 new shadcn UI primitives in `src/components/ui/`:
  * `select.tsx` — Radix Select (Trigger/Content/Item/Group/Value/Label/Separator + scroll buttons).
  * `tabs.tsx` — Radix Tabs (Tabs/TabsList/TabsTrigger/TabsContent).
  * `table.tsx` — standard shadcn table (Table/TableHeader/TableBody/TableRow/TableHead/TableCell/TableFooter/TableCaption) with hover + scroll wrapper.
  * `progress.tsx` — Radix Progress with custom `indicatorClassName` prop so we can theme the bar per KPI.
  * `skeleton.tsx` — `animate-pulse` skeleton primitive for loading states.
- Created `src/lib/dashboard/aggregate.ts` — shared aggregation helper (used by both the Server Component and the API route so the initial render is server-side):
  * `DashboardFilters` type (campaign/tehsil/uc/day).
  * `DayFilter = '1'|'2'|'3'|'4'|'all'`.
  * `DashboardKpis`, `DayBreakdownRow`, `UcBreakdownRow`, `DashboardRow`, `DashboardData`, `FilterOptions` interfaces.
  * `buildFilterOptions()` — dedupes identifier rows into campaigns / tehsils-by-campaign / UCs-by-campaign+tehsil / distinct days.
  * `fetchDashboardData()` — runs daily + catchup `.select()` in parallel with `.eq('user_id', userId)` plus optional campaign/tehsil/uc/day filters; aggregates KPIs (Total Target, OPV Covered, Coverage %, Missed Children, Refusals, Teams Reported), day-by-day breakdown (1-4), UC-wise breakdown (coverage % per UC sorted desc), and a capped raw-rows list (100 rows). Coverage % is computed from `opv_given/over_all_target*100` (unambiguous — never relies on the possibly-ambiguous `admin_coverage_pct` column).
  * `fetchCampaignKpis()` — single-campaign KPIs for the comparison view.
  * Used `Awaited<ReturnType<typeof createClient>>` for the Supabase client type (avoids the generic-resolution issue noted in Step 5 with the `SupabaseClient<Database>` alias that omits the schema-name generic).
- Created `src/app/api/dashboard-data/route.ts` — GET handler. Auth via `getUser()`, parses query params (campaign/tehsil/uc/day with day defaulted to 'all' and validated against the allowed set), calls `fetchDashboardData()`, returns `{ success, filters, kpis, dayBreakdown, ucBreakdown, rows }`. RLS handles ownership; explicit `.eq('user_id')` is also added.
- Created `src/app/api/campaign-comparison/route.ts` — GET handler taking `current` + `previous` campaign names, returns both campaigns' KPIs via `fetchCampaignKpis()`.
- Created `src/components/dashboard/filter-bar.tsx` — Client Component with cascading shadcn Select dropdowns (Campaign → Tehsil → UC, plus Day 1/2/3/4/All). Tehsil dropdown is disabled until a campaign is picked, UC dropdown is disabled until a tehsil is picked. Includes Apply Filters + Reset buttons and a "Filters active" hint. Uses `useTransition` so the parent can mark the refresh as non-urgent.
- Created `src/components/dashboard/kpi-cards.tsx` — 6 KPI cards (Total Target, OPV Covered, Coverage %, Missed Children, Refusals, Teams Reported). Each card has a Lucide icon (Target/Syringe/Percent/AlertTriangle/Ban/Users), big formatted number (`formatNumber()`), color-coded tone (blue/cyan/green/amber/red/purple), and a subtle ring + hover shadow. Coverage % card shows a Progress bar colored by performance tier (≥95 green / ≥80 blue / ≥60 amber / else red). Missed & Refusal cards also tone-shift based on magnitude. Exports `KpiCardsSkeleton` for loading states.
- Created `src/components/dashboard/charts.tsx` — three Recharts visualizations using `hsl(var(--chart-1..5))` palette:
  * `DayByDayChart` — vertical BarChart of OPV / Missed / Refusals across Days 1-4 with legend + tooltip.
  * `UcCoverageChart` — horizontal BarChart showing bottom-10 UCs by coverage % (lowest first), color-coded per cell (red<60 / amber<80 / blue<95 / green≥95), with reference lines at 80% and 95%.
  * `CoverageVsTargetChart` — ComposedChart for top-10 UCs by target: target bar (grey), OPV area gradient (blue), coverage % line (purple, secondary right axis).
  * Each chart has an empty-state fallback ("No data for the selected filters.") and `ChartsSkeleton` for transitions.
- Created `src/components/dashboard/campaign-comparison.tsx` — Client Component with two campaign Select pickers + Compare button. Calls `/api/campaign-comparison`, renders a 5-column table (Metric | Current | Previous | Variance | Variance %) for 6 metrics. Variance is color-coded green/red with TrendingUp/TrendingDown icons based on whether the change is in the desired direction (e.g. fewer refusals = green). Shows a "need at least 2 campaigns" placeholder when the user has only 1 campaign.
- Created `src/components/dashboard/dashboard-client.tsx` — Client orchestrator that holds filter + data state. Receives server-rendered `initialData` so the first paint is instant; on Apply/Reset it calls `/api/dashboard-data` via `fetch()` inside `useTransition` (shows `KpiCardsSkeleton`/`ChartsSkeleton` during the transition). Renders FilterBar, active-filter chip row, error banner with Retry, KPI cards, the three charts, a scrollable raw-rows table (max-h-96 with sticky header), and the CampaignComparison card. Footer note reminds the user that RLS scopes data to their account.
- REPLACED `src/app/dashboard/page.tsx` — Server Component that:
  * Calls `requireUser()` (redirects to /login if not signed in).
  * Fetches identifier rows (campaign_name/tehsil/uc_name/campaign_day) from both daily + catchup tables in parallel and builds `FilterOptions` via `buildFilterOptions()`.
  * If `filterOptions.campaigns.length === 0`, renders an `EmptyState` CTA card linking to /upload with a "What you'll get" list and the user's email.
  * Otherwise fetches initial aggregated data via `fetchDashboardData()` and renders `<DashboardClient>` with that initial data + initial filters (all/unfiltered).
  * Branded sticky header (logo + "Dashboard" badge + Upload button + UserMenu), title row with campaign/tehsil counts, and a 3-card next-steps strip (Upload more, Re-fetch, AI Insights coming soon).
- Updated `src/app/page.tsx` landing page progress tracker:
  * Badge text now reads "Step 6 Complete — Dashboard UI + Charts Ready".
  * Step 6 marked with ✓ (green) in the Build Progress list.
- Fixed type issues found during `bunx tsc --noEmit`:
  * The `SupabaseClient` alias in `src/types/database.ts` is missing the schema-name generic that newer `@supabase/supabase-js` requires — resolved in `aggregate.ts` by deriving the type as `Awaited<ReturnType<typeof createClient>>` instead of importing the alias. Did NOT modify `src/types/database.ts` (per task constraints).
  * `EmptyState` was being passed `user.email` (string | undefined) — changed to `user.email ?? "user"`.
- Fixed a bug in `campaign-comparison.tsx` useEffect: the second `setPrevious(...)` call was mistakenly calling `setCurrent(...)`.
- Verified: `bunx tsc --noEmit` → exit 0 (no errors); `bun run lint` → ✔ No ESLint warnings or errors.

Stage Summary:
- Full dashboard live at `/dashboard`: server-rendered first paint (instant KPIs + charts on initial load) with client-side filter refetches.
- 6 KPI cards with real data from the user's uploaded campaigns (Total Target, OPV Covered, Coverage %, Missed Children, Refusals, Teams Reported) — color-coded by performance tier.
- Cascading filters (Campaign → Tehsil → UC, plus Day 1/2/3/4/All) with Apply + Reset buttons and active-filter chips.
- 3 Recharts visualizations: Day-by-day bar, UC-wise horizontal bar (bottom-10 by coverage %), Composed coverage-vs-target chart (top-10 by target).
- Side-by-side Campaign Comparison view with variance % table and color-coded trend indicators.
- Scrollable raw-rows table (max 100 rows, sticky header) showing per-UC breakdown.
- Friendly empty state with CTA → /upload when the user has no data.
- Loading skeletons for both KPI cards and charts during filter transitions.
- Fully responsive (mobile-stacked → desktop grids), professional palette (blue/cyan/green/amber/red — no indigo), accessible (Labels, semantic HTML, keyboard-navigable Selects).
- Files created (12): `src/components/ui/{select,tabs,table,progress,skeleton}.tsx`, `src/lib/dashboard/aggregate.ts`, `src/app/api/dashboard-data/route.ts`, `src/app/api/campaign-comparison/route.ts`, `src/components/dashboard/{filter-bar,kpi-cards,charts,campaign-comparison,dashboard-client}.tsx`.
- Files modified (2): `src/app/dashboard/page.tsx` (replaced placeholder with full dashboard), `src/app/page.tsx` (progress tracker updated).
- Next: Step 7 — Groq LLaMA-3 AI Insights on top of the aggregated dashboard data.
