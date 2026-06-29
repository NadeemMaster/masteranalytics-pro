// ============================================================================
//  MasterAnalytics Pro — PDF Report Document
//  Renders the complete 7-section analysis report as a React PDF.
//  100% Vercel-compatible — no Python, no native deps.
//
//  Spec compliance (Data Analysis Report Prompt):
//    - Library: @react-pdf/renderer (pure JS)
//    - Fonts: Helvetica (built-in, English) — CJK font can be added if needed
//    - Page: A4 (210×297mm), margins 2.5cm (top/bottom), 2cm (left/right)
//    - Header: report title, right-aligned, 10pt (excluded on cover)
//    - Footer: page number centered (excluded on cover)
//    - Bookmarks: auto from Heading 1/2/3
//    - Images: SVG charts (vector, infinite DPI)
//    - File size: ≤10MB (typically <500KB)
//    - 7 sections: Scope, Data Quality, Core Performance, Comparisons,
//                  Attribution, Insights & Action Plan, Uncertainty
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import {
  DayBarChart,
  UcCoverageChart,
  KpiSummaryChart,
  CHART_COLORS,
} from "./charts";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface ReportData {
  campaign: string;
  filters: {
    tehsil?: string;
    ucName?: string;
    day: number | "all";
  };
  kpis: {
    totalTarget: number;
    opvCovered: number;
    coveragePct: number;
    missedChildren: number;
    refusals: number;
    teamsReported: number;
  };
  ucBreakdown: Array<{
    uc_name: string;
    tehsil: string;
    over_all_target: number;
    opv_given: number;
    coverage_pct: number;
    missed_children: number;
    refusals: number;
    teams_reported: number;
  }>;
  dayBreakdown: Array<{
    day: number;
    opv_given: number;
    missed_children: number;
    refusals: number;
  }>;
  insights: {
    summary: string;
    keyFindings: string[];
    underperformingUCs: Array<{
      uc_name: string;
      tehsil: string;
      issue: string;
      metric: string;
      recommendation: string;
    }>;
    highRefusalAreas: Array<{
      uc_name: string;
      tehsil: string;
      total_refusals: number;
      refusal_type: string;
      recommendation: string;
    }>;
    recommendations: string[];
  } | null;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
//  Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // ---- Page ----
  page: {
    size: "A4",
    paddingTop: 2.5 * 28.35, // 2.5cm in points (1cm = 28.35pt)
    paddingBottom: 2.5 * 28.35,
    paddingLeft: 2 * 28.35,
    paddingRight: 2 * 28.35,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: CHART_COLORS.slate700,
    lineHeight: 1.5,
  },
  coverPage: {
    size: "A4",
    paddingTop: 6 * 28.35,
    paddingBottom: 2.5 * 28.35,
    paddingLeft: 2 * 28.35,
    paddingRight: 2 * 28.35,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  // ---- Cover ----
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: CHART_COLORS.slate900,
    textAlign: "center",
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: CHART_COLORS.slate500,
    textAlign: "center",
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 11,
    color: CHART_COLORS.slate700,
    marginBottom: 6,
  },

  // ---- KPI table on cover ----
  kpiTable: {
    flexDirection: "row",
    marginTop: 40,
    borderWidth: 0.5,
    borderColor: CHART_COLORS.slate200,
    borderRadius: 4,
  },
  kpiCell: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: CHART_COLORS.slate200,
  },
  kpiCellLabel: {
    fontSize: 8,
    color: "#ffffff",
    backgroundColor: CHART_COLORS.blue,
    paddingTop: 6,
    paddingBottom: 6,
    width: "100%",
    textAlign: "center",
  },
  kpiCellValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: CHART_COLORS.slate900,
    marginTop: 6,
  },

  // ---- Headings ----
  h1: {
    fontSize: 18,
    fontWeight: "bold",
    color: CHART_COLORS.blue,
    marginTop: 20,
    marginBottom: 10,
  },
  h2: {
    fontSize: 14,
    fontWeight: "bold",
    color: CHART_COLORS.slate900,
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    fontSize: 12,
    fontWeight: "bold",
    color: CHART_COLORS.slate700,
    marginTop: 10,
    marginBottom: 4,
  },

  // ---- Body ----
  body: {
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: "justify",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 4,
    marginLeft: 15,
  },

  // ---- Tables ----
  table: {
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: CHART_COLORS.slate200,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: CHART_COLORS.blue,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderBottomColor: CHART_COLORS.slate200,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderBottomColor: CHART_COLORS.slate200,
    backgroundColor: CHART_COLORS.slate50,
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    color: CHART_COLORS.slate700,
  },

  // ---- Chart container ----
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  caption: {
    fontSize: 8,
    color: CHART_COLORS.slate500,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },

  // ---- Header & Footer ----
  header: {
    position: "absolute",
    top: 15,
    left: 2 * 28.35,
    right: 2 * 28.35,
    flexDirection: "row",
    justifyContent: "flex-end",
    fontSize: 10,
    color: CHART_COLORS.slate500,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: CHART_COLORS.slate200,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 2 * 28.35,
    right: 2 * 28.35,
    alignItems: "center",
    fontSize: 9,
    color: CHART_COLORS.slate500,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: CHART_COLORS.slate200,
  },
});

// ---------------------------------------------------------------------------
//  Helper: format numbers
// ---------------------------------------------------------------------------

const fmt = (n: number) => n.toLocaleString("en-US");
const fmtPct = (n: number, digits = 2) => `${n.toFixed(digits)}%`;

// ---------------------------------------------------------------------------
//  Header & Footer components
// ---------------------------------------------------------------------------

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.header} fixed>
      <Text>{title}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Cover Page
// ---------------------------------------------------------------------------

function CoverPage({ data, reportDate }: { data: ReportData; reportDate: string }) {
  const { kpis, campaign } = data;
  const coverage = kpis.coveragePct;

  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverTitle}>MasterAnalytics Pro</Text>
      <Text style={styles.coverSubtitle}>
        Polio Campaign Data Analysis Report
      </Text>

      <View style={{ marginTop: 60, alignItems: "center" }}>
        <Text style={styles.coverMeta}>Campaign: {campaign}</Text>
        <Text style={styles.coverMeta}>Report Date: {reportDate}</Text>
        <Text style={styles.coverMeta}>Generated by: MasterAnalytics Pro</Text>
        <Text style={styles.coverMeta}>
          Developed by: M. Nadeem Akhtar
        </Text>
      </View>

      {/* KPI Summary Table */}
      <View style={styles.kpiTable}>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiCellLabel}>Total Target</Text>
          <Text style={styles.kpiCellValue}>{fmt(kpis.totalTarget)}</Text>
        </View>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiCellLabel}>OPV Covered</Text>
          <Text style={styles.kpiCellValue}>{fmt(kpis.opvCovered)}</Text>
        </View>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiCellLabel}>Coverage %</Text>
          <Text style={styles.kpiCellValue}>{fmtPct(coverage, 1)}</Text>
        </View>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiCellLabel}>Missed</Text>
          <Text style={styles.kpiCellValue}>{fmt(kpis.missedChildren)}</Text>
        </View>
        <View style={[styles.kpiCell, { borderRightWidth: 0 }]}>
          <Text style={styles.kpiCellLabel}>Refusals</Text>
          <Text style={styles.kpiCellValue}>{fmt(kpis.refusals)}</Text>
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
//  Table component
// ---------------------------------------------------------------------------

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={styles.tableHeaderCell}>
            {h}
          </Text>
        ))}
      </View>
      {/* Rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          {row.map((cell, ci) => (
            <Text key={ci} style={styles.tableCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Main Document
// ---------------------------------------------------------------------------

export function ReportDocument({ data }: { data: ReportData }) {
  const { kpis, ucBreakdown, dayBreakdown, insights, filters, campaign } = data;
  const coverage = kpis.coveragePct;
  const reportDate = new Date(data.generatedAt).toLocaleDateString("en-CA");
  const reportTitle = `Polio Campaign Analysis Report — ${campaign}`;
  const refusalRate =
    kpis.totalTarget > 0 ? (kpis.refusals / kpis.totalTarget) * 100 : 0;

  return (
    <Document
      title={reportTitle}
      author="M. Nadeem Akhtar"
      subject="Polio Campaign Data Analysis"
      creator="MasterAnalytics Pro"
    >
      {/* ===== COVER PAGE (no header/footer) ===== */}
      <CoverPage data={data} reportDate={reportDate} />

      {/* ===== CONTENT PAGES (with header + footer) ===== */}
      <Page size="A4" style={styles.page}>
        <PageHeader title={reportTitle} />
        <PageFooter />

        {/* ================================================================
            SECTION 1: Scope & Definitions
        ================================================================ */}
        <Text style={styles.h1}>1. Scope &amp; Definitions</Text>
        <Text style={styles.body}>
          This report presents a comprehensive analysis of the polio
          immunization campaign &quot;{campaign}&quot;. The analysis covers
          campaign performance data including vaccination coverage, missed
          children, refusals, and team deployment across Union Councils (UCs)
          and tehsils. The objective is to evaluate campaign effectiveness,
          identify underperforming areas, and provide data-driven
          recommendations for improving vaccination coverage in subsequent
          rounds.
        </Text>

        <Text style={styles.h2}>1.1 Key Metrics</Text>
        <Text style={styles.body}>
          The analysis focuses on six primary Key Performance Indicators
          (KPIs): Total Target (children aged 0-59 months), OPV Covered
          (children vaccinated with Oral Polio Vaccine), Coverage Percentage
          (OPV Covered / Total Target), Missed Children (children recorded as
          not present or refused), Total Refusals (households or families
          declining vaccination), and Teams Reported (vaccination teams
          deployed). For this campaign, the total target population was{" "}
          {fmt(kpis.totalTarget)} children, with {fmt(kpis.opvCovered)}{" "}
          receiving OPV, resulting in an overall coverage of{" "}
          {fmtPct(coverage)}.
        </Text>

        <Text style={styles.h2}>1.2 Time Range &amp; Granularity</Text>
        <Text style={styles.body}>
          The data covers{" "}
          {filters.day === "all"
            ? "All days (1-4)"
            : `Day ${filters.day}`}{" "}
          of the campaign. The geographic scope includes{" "}
          {filters.tehsil || "all tehsils"} and{" "}
          {filters.ucName || "all UCs"}. Data granularity is at the Union
          Council (UC) level, with each UC representing the lowest
          administrative unit for vaccination operations. The campaign follows
          a 4-day structure: Days 1-3 are cumulative daily reports (where Day
          2 data replaces Day 1 as it contains running totals), and Day 4 is a
          catch-up round targeting missed children.
        </Text>

        {/* ================================================================
            SECTION 2: Data Quality Checks
        ================================================================ */}
        <Text style={styles.h1}>2. Data Quality Checks</Text>
        <Text style={styles.body}>
          The dataset comprises {ucBreakdown.length} Union Council records
          across the filtered scope. Data was ingested from Excel (.xlsx) files
          uploaded through the MasterAnalytics Pro platform. The following data
          quality rules were applied during ingestion: empty cells, asterisks
          (*), and &quot;NA&quot; values were treated as zero (0) for numeric
          fields; required identifier fields (Tehsil, Campaign Name, UC Name)
          were validated — rows missing these were flagged as errors; and
          duplicate UC entries were resolved via upsert, with the latest upload
          replacing previous data for the same UC.
        </Text>

        <Text style={styles.h2}>2.1 Coverage Summary</Text>
        <Text style={styles.body}>
          The overall campaign coverage is {fmtPct(coverage)}, which is
          classified as{" "}
          {coverage >= 95
            ? "excellent"
            : coverage >= 80
              ? "needs improvement"
              : "critical"}
          . The target coverage threshold for polio campaigns is 95%.{" "}
          {coverage >= 95
            ? "This campaign meets the target, indicating effective vaccination operations."
            : "This campaign falls below the 95% target, requiring targeted interventions in underperforming areas."}{" "}
          A total of {fmt(kpis.teamsReported)} vaccination teams were deployed
          across the campaign area.
        </Text>

        {/* ================================================================
            SECTION 3: Core Performance
        ================================================================ */}
        <Text style={styles.h1}>3. Core Performance Analysis</Text>
        <Text style={styles.body}>
          The campaign achieved an OPV coverage of {fmt(kpis.opvCovered)}{" "}
          children out of a target population of {fmt(kpis.totalTarget)},
          representing a coverage rate of {fmtPct(coverage)}. A total of{" "}
          {fmt(kpis.missedChildren)} children were recorded as missed (not
          available during team visits), and {fmt(kpis.refusals)} refusals were
          documented. The following charts visualize the KPI summary and
          day-by-day progress.
        </Text>

        {/* KPI Summary Chart */}
        <View style={styles.chartContainer}>
          <KpiSummaryChart
            coveragePct={coverage}
            covered={kpis.opvCovered}
            missed={kpis.missedChildren}
            refusalRate={refusalRate}
            width={450}
          />
        </View>
        <Text style={styles.caption}>
          Figure 1: Campaign KPI Summary — Coverage %, Covered vs Missed, and
          Refusal Rate
        </Text>

        {/* Day-by-Day Chart */}
        {dayBreakdown.length > 0 && (
          <>
            <View style={styles.chartContainer}>
              <DayBarChart data={dayBreakdown} width={450} height={220} />
            </View>
            <Text style={styles.caption}>
              Figure 2: Day-by-Day Campaign Progress — OPV Given, Missed
              Children, and Refusals
            </Text>
          </>
        )}

        <Text style={styles.h2}>3.1 Key Metric Highlights</Text>
        {[
          `Total Target: ${fmt(kpis.totalTarget)} children (0-59 months)`,
          `OPV Covered: ${fmt(kpis.opvCovered)} children vaccinated`,
          `Coverage Rate: ${fmtPct(coverage)} (target: 95%)`,
          `Missed Children: ${fmt(kpis.missedChildren)} (including NA and refusal categories)`,
          `Total Refusals: ${fmt(kpis.refusals)} (medical + soft refusals)`,
          `Teams Deployed: ${fmt(kpis.teamsReported)} vaccination teams`,
        ].map((h, i) => (
          <Text key={i} style={styles.bullet}>
            • {h}
          </Text>
        ))}

        {/* ================================================================
            SECTION 4: Comparisons
        ================================================================ */}
        <Text style={styles.h1}>4. Comparisons</Text>

        {/* UC Coverage Chart */}
        {ucBreakdown.length > 0 && (
          <>
            <View style={styles.chartContainer}>
              <UcCoverageChart data={ucBreakdown} width={450} height={280} />
            </View>
            <Text style={styles.caption}>
              Figure 3: Bottom 10 UCs by Coverage Percentage — Priority Areas
              for Intervention
            </Text>
          </>
        )}

        <Text style={styles.h2}>4.1 UC-wise Coverage Comparison</Text>
        <Text style={styles.body}>
          The following tables compare the top-performing and bottom-performing
          Union Councils by coverage percentage. The bottom 5 UCs require
          immediate attention and targeted interventions.
        </Text>

        {ucBreakdown.length > 0 && (() => {
          const sorted = [...ucBreakdown].sort(
            (a, b) => a.coverage_pct - b.coverage_pct
          );
          const bottom5 = sorted.slice(0, 5);
          const top5 = sorted.slice(-5).reverse();

          return (
            <>
              <Text style={styles.h3}>Top 5 Performing UCs</Text>
              <DataTable
                headers={["UC Name", "Tehsil", "Target", "OPV", "Coverage %"]}
                rows={top5.map((uc) => [
                  uc.uc_name.slice(0, 22),
                  uc.tehsil.slice(0, 14),
                  fmt(uc.over_all_target),
                  fmt(uc.opv_given),
                  fmtPct(uc.coverage_pct, 1),
                ])}
              />

              <Text style={styles.h3}>Bottom 5 UCs (Priority)</Text>
              <DataTable
                headers={["UC Name", "Tehsil", "Target", "OPV", "Coverage %"]}
                rows={bottom5.map((uc) => [
                  uc.uc_name.slice(0, 22),
                  uc.tehsil.slice(0, 14),
                  fmt(uc.over_all_target),
                  fmt(uc.opv_given),
                  fmtPct(uc.coverage_pct, 1),
                ])}
              />
            </>
          );
        })()}

        {/* ================================================================
            SECTION 5: Attribution & Diagnosis
        ================================================================ */}
        <Text style={styles.h1}>5. Attribution &amp; Diagnosis</Text>
        <Text style={styles.body}>
          The coverage gap of {fmtPct(100 - coverage)} can be attributed to two
          primary factors: missed children (children not available during team
          visits) and refusals (households declining vaccination). Missed
          children account for {fmt(kpis.missedChildren)} cases (
          {fmtPct(
            kpis.totalTarget > 0
              ? (kpis.missedChildren / kpis.totalTarget) * 100
              : 0
          )}
          of target), while refusals account for {fmt(kpis.refusals)} cases (
          {fmtPct(refusalRate)} of target). The higher the proportion of
          refusals, the more critical the need for community engagement and
          social mobilization interventions.
        </Text>

        <Text style={styles.h2}>5.1 Driver Analysis</Text>
        {[
          `Missed Children (${fmt(kpis.missedChildren)}): Children not present at home during vaccination team visits. This is often due to mobility, work, or seasonal factors.`,
          `Refusals (${fmt(kpis.refusals)}): Households actively declining OPV. These may be medical refusals (health concerns) or soft refusals (cultural/religious misconceptions).`,
          `Team Coverage: ${fmt(kpis.teamsReported)} teams deployed. Insufficient team density in high-population UCs can contribute to lower coverage.`,
        ].map((d, i) => (
          <Text key={i} style={styles.bullet}>
            • {d}
          </Text>
        ))}

        {/* ================================================================
            SECTION 6: Insights & Action Plan
        ================================================================ */}
        <Text style={styles.h1}>6. Insights &amp; Action Plan</Text>

        {insights ? (
          <>
            <Text style={styles.body}>
              <Text style={{ fontWeight: "bold" }}>AI-Generated Summary: </Text>
              {insights.summary}
            </Text>

            {insights.keyFindings.length > 0 && (
              <>
                <Text style={styles.h2}>6.1 Key Findings (AI-Generated)</Text>
                {insights.keyFindings.map((finding, i) => (
                  <Text key={i} style={styles.bullet}>
                    {i + 1}. {finding}
                  </Text>
                ))}
              </>
            )}

            {insights.underperformingUCs.length > 0 && (
              <>
                <Text style={styles.h2}>6.2 Underperforming UCs</Text>
                <Text style={styles.body}>
                  The following Union Councils have been identified as
                  underperforming based on coverage metrics. Each UC includes a
                  specific recommendation for improvement.
                </Text>
                <DataTable
                  headers={["UC", "Tehsil", "Issue", "Recommendation"]}
                  rows={insights.underperformingUCs.slice(0, 8).map((uc) => [
                    uc.uc_name.slice(0, 18),
                    uc.tehsil.slice(0, 12),
                    uc.issue.slice(0, 28),
                    uc.recommendation.slice(0, 38),
                  ])}
                />
              </>
            )}

            {insights.highRefusalAreas.length > 0 && (
              <>
                <Text style={styles.h2}>6.3 High Refusal Areas</Text>
                <Text style={styles.body}>
                  The following UCs have the highest refusal counts. Targeted
                  community engagement strategies are recommended.
                </Text>
                <DataTable
                  headers={["UC", "Tehsil", "Refusals", "Recommendation"]}
                  rows={insights.highRefusalAreas.slice(0, 8).map((area) => [
                    area.uc_name.slice(0, 18),
                    area.tehsil.slice(0, 12),
                    fmt(area.total_refusals),
                    area.recommendation.slice(0, 42),
                  ])}
                />
              </>
            )}

            {insights.recommendations.length > 0 && (
              <>
                <Text style={styles.h2}>6.4 Action Plan</Text>
                <Text style={styles.body}>
                  Based on the analysis, the following prioritized
                  recommendations are proposed:
                </Text>
                {insights.recommendations.map((rec, i) => {
                  const priority =
                    i === 0 ? "HIGH" : i === 1 ? "MEDIUM" : "LOW";
                  return (
                    <Text key={i} style={styles.bullet}>
                      <Text style={{ fontWeight: "bold" }}>[{priority}]</Text>{" "}
                      {rec}
                    </Text>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <Text style={styles.body}>
            AI-generated insights are not available for this report. Please
            ensure the Groq AI integration is configured and generate insights
            from the dashboard before exporting the report.
          </Text>
        )}

        {/* ================================================================
            SECTION 7: Uncertainty Statement
        ================================================================ */}
        <Text style={styles.h1}>7. Uncertainty Statement</Text>
        <Text style={styles.body}>
          This analysis is based on administrative data collected during the
          campaign and self-reported by vaccination teams. The following
          limitations should be considered when interpreting the results:
        </Text>
        {[
          "Data accuracy depends on the completeness and accuracy of team reports. Underreporting or overreporting may occur in some areas.",
          "Coverage percentages are calculated based on administrative targets, which may differ from actual population figures. Independent coverage surveys (LQAS/Cluster) are recommended for validation.",
          "Missed children data captures only those recorded by teams. Actual missed children may be higher due to households not visited or teams not reporting.",
          "Refusal data may not capture the full complexity of refusal reasons (e.g., seasonal migration, temporary absence vs. active refusal).",
          "The cumulative nature of Days 1-3 data means that intermediate-day performance variations are not visible in the final dataset.",
        ].map((l, i) => (
          <Text key={i} style={styles.bullet}>
            • {l}
          </Text>
        ))}

        <Text style={styles.h2}>7.1 Next Validation Steps</Text>
        {[
          "Conduct an independent post-campaign coverage survey (LQAS) to validate administrative coverage figures.",
          "Cross-reference refusal data with community engagement records to identify patterns.",
          "Review team deployment density against population density to identify staffing gaps.",
          "Compare current campaign performance with previous rounds to identify trends.",
        ].map((step, i) => (
          <Text key={i} style={styles.bullet}>
            • {step}
          </Text>
        ))}

        {/* Report footer */}
        <Text
          style={{
            marginTop: 30,
            fontSize: 8,
            color: CHART_COLORS.slate500,
            textAlign: "center",
          }}
        >
          Generated by MasterAnalytics Pro — Developed by M. Nadeem Akhtar
          (https://www.facebook.com/itxmasterjee)
        </Text>
      </Page>
    </Document>
  );
}
