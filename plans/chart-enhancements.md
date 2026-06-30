# Chart Enhancements Plan — Day-by-Day & UC-Level Multi-Metric Charts

> **Status:** Approved — ready for implementation
> **Decision:** "Refusals Covered" uses `missed_covered_ref` as a proxy (Option C)
> **Scope:** Enhance the existing Day-by-Day Progress chart, add a new UC-level multi-metric chart, and propose additional analytical charts for data-driven decision making.

---

## 1. Current State Analysis

### 1.1 Current Charts (`src/components/dashboard/charts.tsx`)

| #   | Chart                   | Type                               | Metrics Shown                      | Data Source       |
| --- | ----------------------- | ---------------------------------- | ---------------------------------- | ----------------- |
| 1   | `DayByDayChart`         | Vertical BarChart                  | OPV, Missed, Refusals (3 bars/day) | `DayBreakdownRow` |
| 2   | `UcCoverageChart`       | Horizontal BarChart                | Coverage % only                    | `UcBreakdownRow`  |
| 3   | `CoverageVsTargetChart` | ComposedChart (bars + area + line) | Target, Admin Coverage, Coverage % | `UcBreakdownRow`  |

### 1.2 Current Data Types (`src/lib/dashboard/aggregate.ts`)

```typescript
// Line 41-47 — only 4 fields + day
interface DayBreakdownRow {
  day: number;
  opv: number;
  missed: number;
  refusals: number;
  target: number;
}

// Line 49-59 — 8 fields + day
interface UcBreakdownRow {
  uc: string;
  tehsil: string;
  opv: number;
  adminCoverage: number;
  target: number;
  coveragePct: number;
  missed: number;
  refusals: number;
  day: number;
}
```

### 1.3 Current DB Query (`src/lib/dashboard/aggregate.ts`, line 118-119)

```typescript
const DAILY_COLUMNS =
  "campaign_name, tehsil, uc_name, campaign_day, over_all_target, opv_issued, " +
  "admin_coverage, missed_na_0_59, total_refusal, teams_reported";
```

**Missing from query:** `missed_covered_na` (NA covered same day) and `missed_covered_ref` (refusals covered proxy) — both columns exist in the DB but are not being fetched.

---

## 2. The 6 Requested Metrics — Data Availability Audit

| #   | User's Metric            | DB Column            | In DAILY_COLUMNS?  | In Excel Map?                    | Status                 |
| --- | ------------------------ | -------------------- | ------------------ | -------------------------------- | ---------------------- |
| 1   | Overall target           | `over_all_target`    | ✅ Yes             | ✅ `overalltarget`               | **Ready**              |
| 2   | Admin coverage           | `admin_coverage`     | ✅ Yes             | ✅ `admincoverage`               | **Ready**              |
| 3   | NA Recorded              | `missed_na_0_59`     | ✅ Yes             | ✅ `missedchildrenrecordedna059` | **Ready**              |
| 4   | NA covered same day      | `missed_covered_na`  | ❌ **Not queried** | ✅ `missedchildrencoveredna059`  | **Needs query update** |
| 5   | Refusals recorded        | `total_refusal`      | ✅ Yes             | ✅ `totalrefusal`                | **Ready**              |
| 6   | Refusals covered (proxy) | `missed_covered_ref` | ❌ **Not queried** | ✅ `missedchildrencoveredref059` | **Needs query update** |

### Finding: "Refusals Covered" — Using Proxy Column (Decision: Option C)

The daily table has no dedicated "refusals covered" column. However, it does have `missed_covered_ref` — which tracks **missed children who were covered, categorized under the refusal type**. This is the closest available proxy for "refusals covered."

**Decision (approved by user):** Use `missed_covered_ref` as the "Refusals Covered" metric, labeled as **"Refusals Covered (proxy)"** in the chart UI. This avoids any schema changes and uses data already being uploaded from the Excel spreadsheets (mapped via `missedchildrencoveredref059` → `missed_covered_ref`).

**Note:** This column also needs to be added to the `DAILY_COLUMNS` query string — it exists in the DB but is not currently fetched. See **Section 7** for full details.

---

## 3. Data Layer Changes

### 3.1 Extend `DayBreakdownRow` Type

**File:** `src/lib/dashboard/aggregate.ts` (lines 41-47)

```typescript
export interface DayBreakdownRow {
  day: number;
  opv: number;
  target: number; // over_all_target
  adminCoverage: number; // admin_coverage (count)
  naRecorded: number; // missed_na_0_59
  naCoveredSameDay: number; // missed_covered_na  ← NEW
  refusalsRecorded: number; // total_refusal
  refusalsCovered: number; // missed_covered_ref  ← NEW (proxy)
  // Legacy fields kept for backward compat with existing chart code:
  missed: number; // alias for naRecorded
  refusals: number; // alias for refusalsRecorded
}
```

### 3.2 Extend `UcBreakdownRow` Type

**File:** `src/lib/dashboard/aggregate.ts` (lines 49-59)

```typescript
export interface UcBreakdownRow {
  uc: string;
  tehsil: string;
  opv: number;
  target: number; // over_all_target
  adminCoverage: number; // admin_coverage (count)
  coveragePct: number; // 0-100
  naRecorded: number; // missed_na_0_59
  naCoveredSameDay: number; // missed_covered_na  ← NEW
  refusalsRecorded: number; // total_refusal
  refusalsCovered: number; // missed_covered_ref  ← NEW (proxy)
  day: number;
  // Legacy fields:
  missed: number; // alias for naRecorded
  refusals: number; // alias for refusalsRecorded
}
```

### 3.3 Update DB Query Columns

**File:** `src/lib/dashboard/aggregate.ts` (line 118-119)

```typescript
const DAILY_COLUMNS =
  "campaign_name, tehsil, uc_name, campaign_day, over_all_target, opv_issued, " +
  "admin_coverage, missed_na_0_59, missed_covered_na, missed_covered_ref, " +
  "total_refusal, teams_reported";
//                                              ^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^
//                                              NEW: NA covered     NEW: Refusals covered (proxy)
```

### 3.4 Update `DailyRow` Interface

**File:** `src/lib/dashboard/aggregate.ts` (lines 90-101)

```typescript
interface DailyRow {
  campaign_name: string;
  tehsil: string;
  uc_name: string;
  campaign_day: number;
  over_all_target: number;
  opv_issued: number;
  admin_coverage: number;
  missed_na_0_59: number;
  missed_covered_na: number; // ← NEW (NA covered same day)
  missed_covered_ref: number; // ← NEW (Refusals covered proxy)
  total_refusal: number;
  teams_reported: number;
}
```

### 3.5 Update Aggregation Logic in `fetchDashboardData()`

**File:** `src/lib/dashboard/aggregate.ts`

- **Day breakdown loop** (lines 289-308): Add `naCoveredSameDay` and `refusalsCovered` accumulation
- **UC breakdown loop** (lines 316-361): Add `naCoveredSameDay` and `refusalsCovered` accumulation
- **KPI loop** (lines 262-274): Optionally add `naCoveredSameDay` to KPIs

---

## 4. Chart 1: Enhanced Day-by-Day Progress

### 4.1 Design Challenge

Showing 6 metrics × 4 days = 24 bars in a single bar chart would be visually cluttered and unreadable. The solution is a **ComposedChart with dual Y-axes** and **interactive metric toggles**.

### 4.2 Proposed Design

```
┌─────────────────────────────────────────────────────────┐
│  Day-by-Day Progress                          [4 days]  │
│  Target, coverage, missed & refusals across campaign days│
│                                                         │
│  [All] [Target] [Admin Cov] [NA Rec] [NA Cov] [Ref Rec] │  ← toggle chips
│                                                         │
│  ║ Target    ║ Admin Cov  ║ NA Recorded ║ NA Covered   │
│  ║ (bar)     ║ (bar)      ║ (bar)       ║ (bar)        │
│  ║           ║            ║             ║              │
│  ║ Refusals Recorded ║ Refusals Covered ║              │
│  ║ (bar)             ║ (bar)            ║              │
│                                                         │
│  Day 1    Day 2    Day 3    Day 4                       │
└─────────────────────────────────────────────────────────┘
```

**Approach:**

- Use Recharts `ComposedChart` with grouped bars
- Each metric is a `<Bar>` with a distinct color from the `CHART` palette
- Add a **toggle chip row** above the chart — users click to show/hide individual metrics
- Default: show all 6 metrics
- Left Y-axis: counts (target, admin coverage, NA recorded, NA covered, refusals)
- Tooltip: shows all visible metrics for the hovered day

### 4.3 Color Assignment

| Metric                   | Color      | CHART key             |
| ------------------------ | ---------- | --------------------- |
| Overall Target           | Slate gray | `#94a3b8` (slate-400) |
| Admin Coverage           | Blue       | `CHART.c1`            |
| NA Recorded              | Orange     | `CHART.c3`            |
| NA Covered Same Day      | Green      | `CHART.c2`            |
| Refusals Recorded        | Pink       | `CHART.c5`            |
| Refusals Covered (proxy) | Purple     | `CHART.c4`            |

### 4.4 Component Structure

```tsx
export function DayByDayChart({ data }: DayByDayChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<MetricKey[]>([
    ...ALL_METRICS,
  ]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        day: `Day ${d.day}`,
        target: d.target,
        adminCoverage: d.adminCoverage,
        naRecorded: d.naRecorded,
        naCoveredSameDay: d.naCoveredSameDay,
        refusalsRecorded: d.refusalsRecorded,
        refusalsCovered: d.refusalsCovered,
      })),
    [data],
  );

  // Render toggle chips + ComposedChart with conditional <Bar> elements
}
```

---

## 5. Chart 2: New UC-Level Multi-Metric Chart

### 5.1 Design Challenge

Showing 6 metrics for potentially 50+ UCs in a bar chart is impossible. The solution is a **heatmap-style data table** with color-coded cells, combined with a **sortable, filterable layout**.

### 5.2 Proposed Design: UC Performance Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│  UC Performance Matrix                                  [50 UCs]  │
│  All 6 metrics per UC — click column to sort                     │
│                                                                  │
│  [Search UC...]  [Tehsil ▼]  [Sort: Coverage ▲]                 │
│                                                                  │
│  ┌──────────┬────────┬────────┬──────────┬─────────┬──────────┐ │
│  │ UC       │ Target │ Admin  │ NA Rec  │ NA Cov  │ Refusals │ │
│  │          │        │ Cov %  │          │ Same Day│ Recorded │ │
│  ├──────────┼────────┼────────┼──────────┼─────────┼──────────┤ │
│  │ UC-001   │ 1,234  │ 95.2%  │   45     │   40    │    5     │ │
│  │ UC-002   │  890   │ 78.1%  │   89     │   60    │   12     │ │
│  │ UC-003   │ 1,500  │ 45.3%  │  120     │   30    │   25     │ │
│  │ ...      │  ...   │  ...   │  ...     │  ...    │  ...     │ │
│  └──────────┴────────┴────────┴──────────┴─────────┴──────────┘ │
│                                                                  │
│  Color scale: 🟢 good → 🟡 moderate → 🔴 critical               │
└──────────────────────────────────────────────────────────────────┘
```

**Approach:**

- Render as a **color-coded table** (not a bar chart) — this scales to any number of UCs
- Each cell is color-coded based on thresholds:
  - Coverage %: 🟢 ≥95%, 🔵 ≥80%, 🟡 ≥60%, 🔴 <60%
  - NA Recorded / Refusals: 🟢 low, 🟡 medium, 🔴 high (relative to target)
  - NA Covered Same Day: 🟢 high recovery, 🟡 medium, 🔴 low
- **Sortable columns** — click any header to sort ascending/descending
- **Search box** — filter UCs by name
- **Tehsil filter dropdown** — narrow to a specific tehsil
- **Pagination** — show 10-15 UCs per page with prev/next

### 5.3 Alternative: Grouped Bar Chart (for small UC counts)

If the user has ≤10 UCs, a grouped bar chart could work:

```
For each UC: 6 grouped bars (target, admin cov, NA rec, NA cov, ref rec, ref cov)
```

But this only works for small datasets. The table approach is more robust.

### 5.4 Component Structure

```tsx
export function UcPerformanceMatrix({ data }: UcPerformanceMatrixProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("coveragePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tehsilFilter, setTehsilFilter] = useState<string>("");
  const [page, setPage] = useState(0);

  // Filter → sort → paginate
  const filtered = useMemo(() => { ... }, [data, search, tehsilFilter]);
  const sorted = useMemo(() => { ... }, [filtered, sortKey, sortDir]);
  const paged = useMemo(() => sorted.slice(page * 10, (page + 1) * 10), [sorted, page]);

  // Render table with color-coded cells
}
```

---

## 6. Additional Chart Suggestions for Data-Driven Decisions

These are **new chart ideas** that would add significant analytical value. They are proposed for future implementation (not part of the current 2-chart request, but listed for your consideration).

### 6.1 Coverage Gap Funnel

**Type:** Funnel chart
**Metrics:** Target → Admin Coverage → OPV Issued → Still Missed
**Value:** Shows where children are being lost in the pipeline — is the gap between target and coverage, or between coverage and OPV?

### 6.2 Missed Children Recovery Rate

**Type:** Stacked bar chart (per day)
**Metrics:** NA Recorded (total) split into: NA Covered Same Day (green) + Still Missed (red)
**Value:** Shows same-day recovery efficiency — are teams catching missed children the same day?

### 6.3 Refusal Breakdown Analysis

**Type:** Donut/pie chart + bar chart
**Metrics:** Medical Refusal vs Soft Refusal (donut), per-UC refusal counts (bar)
**Value:** Identifies whether refusals are medical (harder to address) or soft (social mobilization can fix)

### 6.4 Team Efficiency Scatter Plot

**Type:** Scatter plot
**X-axis:** Teams Reported, **Y-axis:** OPV Issued, **Bubble size:** Target
**Value:** Identifies UCs where teams are underperforming relative to team count — OPV per team ratio

### 6.5 Vaccine Wastage Analysis

**Type:** Stacked bar chart (per day)
**Metrics:** OPV Used (green) + OPV Returned (amber) + OPV Wasted (red)
**Value:** Tracks vaccine utilization efficiency — high returns = logistics issues

### 6.6 Geographic Still-Missed Breakdown

**Type:** Horizontal stacked bar (per UC)
**Metrics:** Still missed in UC | out of UC (same tehsil) | out of tehsil (same district) | out of district | out of province
**Value:** Shows whether missed children are local or migrating — critical for follow-up strategy

### 6.7 Day-over-Day Growth Rate

**Type:** Line chart
**Metrics:** % change in OPV issued, coverage %, and missed children from Day N to Day N+1
**Value:** Shows campaign momentum — is coverage accelerating or plateauing?

### 6.8 Catch-up Effectiveness (Day 3 → Day 4)

**Type:** Waterfall chart
**Metrics:** Day 3 Still Missed → Day 4 Target Missed → Day 4 Covered Missed → Day 4 Still Missed
**Value:** Measures how effective the catch-up day was at recovering children missed during Days 1-3

### 6.9 House Coverage vs Child Coverage

**Type:** Dual bar chart
**Metrics:** HH Coverage % vs Admin Coverage % per UC
**Value:** Reveals if low house coverage is the root cause of low child coverage

### 6.10 Vitamin A Co-coverage

**Type:** Bar chart
**Metrics:** Vita 6-11 + Vita 12-59 vs OPV Issued per UC
**Value:** Tracks whether Vitamin A supplementation is keeping pace with OPV

---

## 7. Decision: "Refusals Covered" — RESOLVED ✅

**Chosen approach: Option C — Use `missed_covered_ref` as proxy**

The daily table's `missed_covered_ref` column tracks missed children who were covered, categorized under the refusal type. This is the closest available proxy for "refusals covered" and requires no schema changes.

**Implementation:**

- Add `missed_covered_ref` to the `DAILY_COLUMNS` query string
- Add `missed_covered_ref` to the `DailyRow` interface
- Map it to `refusalsCovered` in `DayBreakdownRow` and `UcBreakdownRow`
- Label as **"Refusals Covered (proxy)"** in chart UI and tooltips
- Color: `CHART.c4` (purple)

**Semantic note:** This represents "missed children (refusal category) who were subsequently covered" — not "refusals that were converted." The label makes this distinction clear to end users.

---

## 8. Implementation Steps

### Phase 1: Data Layer (no UI changes yet)

1. **Update `DAILY_COLUMNS`** in `src/lib/dashboard/aggregate.ts` — add `missed_covered_na` and `missed_covered_ref`
2. **Update `DailyRow` interface** — add `missed_covered_na: number` and `missed_covered_ref: number`
3. **Extend `DayBreakdownRow`** — add `adminCoverage`, `naRecorded`, `naCoveredSameDay`, `refusalsRecorded`, `refusalsCovered` (keep legacy `missed`/`refusals` as aliases)
4. **Extend `UcBreakdownRow`** — add same new fields
5. **Update `fetchDashboardData()`** — aggregate the new fields in both day-breakdown and UC-breakdown loops (map `missed_covered_ref` → `refusalsCovered`)
6. **Update `DashboardKpis`** (optional) — add `naCoveredSameDay` to KPIs if desired

### Phase 2: Enhanced Day-by-Day Chart

7. **Rewrite `DayByDayChart`** in `src/components/dashboard/charts.tsx`:
   - Add metric toggle state (`useState<MetricKey[]>`)
   - Render toggle chip row above chart
   - Map new data fields into `chartData`
   - Render conditional `<Bar>` elements based on visible metrics
   - Update tooltip to show all visible metrics
   - Update `isEmpty` check to account for new fields

### Phase 3: New UC Performance Matrix

8. **Create `UcPerformanceMatrix`** component (new file or in charts.tsx):
   - Color-coded table with sortable columns
   - Search + tehsil filter
   - Pagination (10 UCs/page)
   - Color thresholds per metric

9. **Wire into `DashboardClient`** — add the new chart below the existing chart grid

### Phase 4: Polish & Testing

10. **Update `ChartsSkeleton`** — add skeleton for the new UC matrix
11. **Test with empty data** — ensure graceful "no data" states
12. **Test with single-day filter** — ensure chart adapts when only 1 day is selected
13. **Verify PDF report** — ensure `src/lib/pdf/charts.tsx` still works with extended types

---

## 9. Files to Modify

| File                                            | Change                                                                                 | Type          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| `src/lib/dashboard/aggregate.ts`                | Extend types, update query, update aggregation                                         | **Modify**    |
| `src/components/dashboard/charts.tsx`           | Rewrite DayByDayChart, add UcPerformanceMatrix                                         | **Modify**    |
| `src/components/dashboard/dashboard-client.tsx` | Wire new chart into layout                                                             | **Modify**    |
| `src/lib/pdf/charts.tsx`                        | Verify compatibility with extended types                                               | **Verify**    |
| `src/app/api/generate-report/route.ts`          | Verify compatibility with extended types                                               | **Verify**    |
| `src/app/api/ai-insights/route.ts`              | Verify compatibility with extended types                                               | **Verify**    |
| `supabase/schema.sql`                           | No changes needed — `missed_covered_ref` already exists                                | **No change** |
| `src/lib/excel/column-maps.ts`                  | No changes needed — `missedchildrencoveredref059` already maps to `missed_covered_ref` | **No change** |
| `src/types/database.ts`                         | No changes needed — `missed_covered_ref` already in `DailyCampaignRow`                 | **No change** |

---

## 10. No New Dependencies Required

All charts use existing dependencies:

- `recharts` — already installed, supports ComposedChart, BarChart, tables
- `lucide-react` — for icons in toggle chips
- Existing shadcn/ui `Card`, `Badge`, `Input`, `Select`, `Table` components

---

## 11. Acceptance Criteria

- [ ] Day-by-Day chart shows all 6 metrics (Target, Admin Coverage, NA Recorded, NA Covered Same Day, Refusals Recorded, Refusals Covered proxy) with toggle chips
- [ ] Each metric has a distinct color matching the chart palette
- [ ] Toggle chips show/hide individual metrics
- [ ] UC Performance Matrix renders all UCs with 6 metric columns
- [ ] Matrix columns are sortable (click header to sort)
- [ ] Matrix has search box for UC name filtering
- [ ] Matrix has tehsil dropdown filter
- [ ] Matrix cells are color-coded by threshold
- [ ] Matrix paginates (10 UCs per page)
- [ ] Both charts show graceful "no data" state when empty
- [ ] Both charts work with day filter (single day vs all days)
- [ ] PDF report still generates correctly with extended data types
- [ ] No TypeScript errors
- [ ] No new npm dependencies added
