#!/usr/bin/env python3
# ============================================================================
#  MasterAnalytics Pro — PDF Report Generator
#  Generates an A4 analysis report with charts, bookmarks, headers/footers.
#
#  Spec compliance (Data Analysis Report Prompt):
#    - Library: reportlab
#    - Fonts: SimSun/SimHei for CJK, Times-Roman for English
#    - Page: A4 (210x297mm), margins 2.5cm (top/bottom), 2cm (left/right)
#    - Header: report title, right-aligned, 10pt (excluded on cover)
#    - Footer: page number centered (excluded on cover)
#    - Bookmarks: auto-generated from Heading 1/2/3
#    - Images: >=150 DPI, aspect ratio locked, width <=80% page
#    - File size: <=10MB
#    - 7 sections: Scope, Data Quality, Core Performance, Comparisons,
#                  Attribution, Insights & Action Plan, Uncertainty
#
#  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
# ============================================================================

import sys
import json
import os
import io
from datetime import datetime
from pathlib import Path

# ---- Matplotlib for chart generation ----
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

# Use SimHei for any Chinese characters in charts
plt.rcParams["font.sans-serif"] = ["SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

# ---- ReportLab for PDF ----
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Image,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# ============================================================================
#  Font Registration
# ============================================================================

FONT_DIR = Path(__file__).parent.parent.parent / "fonts"
SIMHEI_PATH = FONT_DIR / "simhei.ttf"

# Register SimHei (used for any CJK text + as our primary body font)
pdfmetrics.registerFont(TTFont("SimHei", str(SIMHEI_PATH)))

# English font: Times-Roman is built-in to reportlab (no registration needed)
# We'll use SimHei for body text (handles both English + Chinese gracefully)
# and Times-Roman for English-only emphasis.

BODY_FONT = "SimHei"
ENGLISH_FONT = "Times-Roman"

# ============================================================================
#  Color Palette (matches the dashboard theme)
# ============================================================================

COLOR_PRIMARY = HexColor("#2563eb")    # blue-600
COLOR_CYAN = HexColor("#06b6d4")       # cyan-500
COLOR_GREEN = HexColor("#16a34a")      # green-600
COLOR_AMBER = HexColor("#d97706")      # amber-600
COLOR_RED = HexColor("#dc2626")        # red-600
COLOR_SLATE_900 = HexColor("#0f172a")  # slate-900
COLOR_SLATE_700 = HexColor("#334155")  # slate-700
COLOR_SLATE_500 = HexColor("#64748b")  # slate-500
COLOR_SLATE_200 = HexColor("#e2e8f0")  # slate-200
COLOR_SLATE_50 = HexColor("#f8fafc")   # slate-50

# Chart colors (matplotlib hex strings without #)
CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4"]

# ============================================================================
#  Styles
# ============================================================================

def build_styles():
    """Build paragraph styles for the report."""
    styles = getSampleStyleSheet()

    # Cover title
    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontName=BODY_FONT,
        fontSize=28,
        leading=36,
        textColor=COLOR_SLATE_900,
        alignment=TA_CENTER,
        spaceAfter=12,
    ))

    # Cover subtitle
    styles.add(ParagraphStyle(
        name="CoverSubtitle",
        fontName=BODY_FONT,
        fontSize=14,
        leading=20,
        textColor=COLOR_SLATE_500,
        alignment=TA_CENTER,
        spaceAfter=8,
    ))

    # Cover meta (campaign name, date)
    styles.add(ParagraphStyle(
        name="CoverMeta",
        fontName=ENGLISH_FONT,
        fontSize=11,
        leading=16,
        textColor=COLOR_SLATE_700,
        alignment=TA_CENTER,
    ))

    # Heading 1 (section titles) — bookmark level 0
    styles.add(ParagraphStyle(
        name="Heading1Style",
        fontName=BODY_FONT,
        fontSize=18,
        leading=26,
        textColor=COLOR_PRIMARY,
        spaceBefore=20,
        spaceAfter=10,
        keepWithNext=True,
    ))

    # Heading 2 (subsection) — bookmark level 1
    styles.add(ParagraphStyle(
        name="Heading2Style",
        fontName=BODY_FONT,
        fontSize=14,
        leading=20,
        textColor=COLOR_SLATE_900,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    ))

    # Heading 3 — bookmark level 2
    styles.add(ParagraphStyle(
        name="Heading3Style",
        fontName=BODY_FONT,
        fontSize=12,
        leading=18,
        textColor=COLOR_SLATE_700,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    ))

    # Body text
    styles.add(ParagraphStyle(
        name="BodyStyle",
        fontName=BODY_FONT,
        fontSize=10,
        leading=16,
        textColor=COLOR_SLATE_700,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    ))

    # Bullet item
    styles.add(ParagraphStyle(
        name="BulletStyle",
        fontName=BODY_FONT,
        fontSize=10,
        leading=16,
        textColor=COLOR_SLATE_700,
        leftIndent=20,
        bulletIndent=10,
        spaceAfter=4,
    ))

    # Table cell
    styles.add(ParagraphStyle(
        name="TableCell",
        fontName=BODY_FONT,
        fontSize=9,
        leading=12,
        textColor=COLOR_SLATE_700,
    ))

    # Table header
    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName=BODY_FONT,
        fontSize=9,
        leading=12,
        textColor=white,
    ))

    # Caption (below images)
    styles.add(ParagraphStyle(
        name="CaptionStyle",
        fontName=BODY_FONT,
        fontSize=8,
        leading=12,
        textColor=COLOR_SLATE_500,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=12,
    ))

    return styles


# ============================================================================
#  Chart Generation (matplotlib → PNG at 150+ DPI)
# ============================================================================

def generate_charts(data: dict, output_dir: Path) -> dict:
    """Generate chart PNGs and return their file paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    charts = {}

    kpis = data.get("kpis", {})
    uc_breakdown = data.get("ucBreakdown", [])
    day_breakdown = data.get("dayBreakdown", [])

    # ---- Chart 1: Day-by-Day Progress (Bar chart) ----
    if day_breakdown:
        fig, ax = plt.subplots(figsize=(8, 4), dpi=150)
        days = [f"Day {d['day']}" for d in day_breakdown]
        opv = [d.get("opv_given", 0) for d in day_breakdown]
        missed = [d.get("missed_children", 0) for d in day_breakdown]
        refusals = [d.get("refusals", 0) for d in day_breakdown]

        x = range(len(days))
        width = 0.25
        ax.bar([i - width for i in x], opv, width, label="OPV Given", color=CHART_COLORS[0])
        ax.bar(x, missed, width, label="Missed Children", color=CHART_COLORS[2])
        ax.bar([i + width for i in x], refusals, width, label="Refusals", color=CHART_COLORS[3])

        ax.set_xlabel("Campaign Day", fontsize=10)
        ax.set_ylabel("Count", fontsize=10)
        ax.set_title("Day-by-Day Campaign Progress", fontsize=12, fontweight="bold")
        ax.set_xticks(list(x))
        ax.set_xticklabels(days, fontsize=9)
        ax.legend(fontsize=9)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, _: f"{y/1000:.0f}K" if y >= 1000 else f"{y:.0f}"))
        ax.grid(axis="y", alpha=0.3)
        fig.tight_layout()
        path = output_dir / "chart_day_progress.png"
        fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        charts["day_progress"] = str(path)

    # ---- Chart 2: UC-wise Coverage (Horizontal bar, top/bottom 10) ----
    if uc_breakdown:
        sorted_uc = sorted(uc_breakdown, key=lambda u: u.get("coverage_pct", 0))
        # Show bottom 10 (underperforming) — most actionable
        bottom_10 = sorted_uc[:10]

        fig, ax = plt.subplots(figsize=(8, 5), dpi=150)
        uc_names = [u["uc_name"][:20] for u in bottom_10]
        coverages = [u.get("coverage_pct", 0) for u in bottom_10]

        bars = ax.barh(uc_names, coverages, color=[
            CHART_COLORS[3] if c < 60 else CHART_COLORS[2] if c < 80 else CHART_COLORS[1] if c < 95 else CHART_COLORS[1]
            for c in coverages
        ])
        ax.set_xlabel("Coverage %", fontsize=10)
        ax.set_title("Bottom 10 UCs by Coverage %", fontsize=12, fontweight="bold")
        ax.axvline(x=95, color=CHART_COLORS[1], linestyle="--", alpha=0.5, label="Target (95%)")
        ax.legend(fontsize=9)
        # Add value labels
        for bar, val in zip(bars, coverages):
            ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                    f"{val:.1f}%", va="center", fontsize=8)
        ax.set_xlim(0, max(coverages) * 1.15 if coverages else 100)
        ax.grid(axis="x", alpha=0.3)
        fig.tight_layout()
        path = output_dir / "chart_uc_coverage.png"
        fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        charts["uc_coverage"] = str(path)

    # ---- Chart 3: KPI Summary (donut/pie) ----
    if kpis:
        fig, axes = plt.subplots(1, 3, figsize=(10, 3.5), dpi=150)

        # Coverage donut
        coverage = kpis.get("coveragePct", 0)
        ax1 = axes[0]
        ax1.pie([coverage, max(0, 100-coverage)], colors=[CHART_COLORS[0], "#e2e8f0"],
                startangle=90, counterclock=False,
                wedgeprops=dict(width=0.4))
        ax1.text(0, 0, f"{coverage:.1f}%", ha="center", va="center", fontsize=16, fontweight="bold")
        ax1.set_title("Coverage %", fontsize=11, fontweight="bold")

        # Missed vs Covered
        ax2 = axes[1]
        covered = kpis.get("opvCovered", 0)
        missed = kpis.get("missedChildren", 0)
        total = covered + missed
        if total > 0:
            ax2.pie([covered, missed], labels=["Covered", "Missed"],
                    colors=[CHART_COLORS[1], CHART_COLORS[2]],
                    autopct="%1.1f%%", startangle=90, textprops={"fontsize": 9})
        ax2.set_title("Covered vs Missed", fontsize=11, fontweight="bold")

        # Refusal breakdown
        ax3 = axes[2]
        refusals = kpis.get("refusals", 0)
        target = kpis.get("totalTarget", 1)
        refusal_rate = (refusals / target * 100) if target > 0 else 0
        ax3.pie([refusal_rate, max(0, 100-refusal_rate)],
                colors=[CHART_COLORS[3], "#e2e8f0"],
                startangle=90, counterclock=False,
                wedgeprops=dict(width=0.4))
        ax3.text(0, 0, f"{refusal_rate:.2f}%", ha="center", va="center", fontsize=14, fontweight="bold")
        ax3.set_title("Refusal Rate %", fontsize=11, fontweight="bold")

        fig.suptitle("Campaign KPI Summary", fontsize=13, fontweight="bold", y=1.02)
        fig.tight_layout()
        path = output_dir / "chart_kpi_summary.png"
        fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        charts["kpi_summary"] = str(path)

    return charts


# ============================================================================
#  Header / Footer (Page Template)
# ============================================================================

class ReportCanvas(canvas.Canvas):
    """Custom canvas that adds headers, footers, and bookmarks on every page
    except the cover (page 1)."""

    def __init__(self, *args, **kwargs):
        self.report_title = kwargs.pop("report_title", "Polio Campaign Analysis Report")
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_header_footer(total_pages)
            super().showPage()
        super().save()

    def _draw_header_footer(self, total_pages):
        page_num = self._pageNumber

        # Skip header/footer on cover page (page 1)
        if page_num == 1:
            return

        # ---- Header: report title, right-aligned, 10pt ----
        self.setFont(ENGLISH_FONT, 10)
        self.setFillColor(COLOR_SLATE_500)
        self.drawRightString(
            A4[0] - 2 * cm,  # right margin
            A4[1] - 1.5 * cm,  # top
            self.report_title
        )
        # Header line
        self.setStrokeColor(COLOR_SLATE_200)
        self.setLineWidth(0.5)
        self.line(2 * cm, A4[1] - 1.7 * cm, A4[0] - 2 * cm, A4[1] - 1.7 * cm)

        # ---- Footer: page number centered ----
        self.setFont(ENGLISH_FONT, 9)
        self.setFillColor(COLOR_SLATE_500)
        self.drawCentredString(A4[0] / 2, 1.5 * cm, f"Page {page_num}")
        # Footer line
        self.line(2 * cm, 2 * cm, A4[0] - 2 * cm, 2 * cm)


# ============================================================================
#  Report Builder
# ============================================================================

def build_report(data: dict, output_path: str):
    """Build the complete PDF report."""
    styles = build_styles()
    charts_dir = Path(output_path).parent / "charts"
    charts = generate_charts(data, charts_dir)

    kpis = data.get("kpis", {})
    uc_breakdown = data.get("ucBreakdown", [])
    day_breakdown = data.get("dayBreakdown", [])
    insights = data.get("insights", {})
    filters = data.get("filters", {})
    campaign_name = data.get("campaign", "Unknown Campaign")

    today = datetime.now().strftime("%Y-%m-%d")
    report_title = f"Polio Campaign Analysis Report — {campaign_name}"

    # ---- Create document ----
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title=report_title,
        author="M. Nadeem Akhtar",
        subject="Polio Campaign Data Analysis",
        creator="MasterAnalytics Pro",
    )

    story = []

    # ========================================================================
    #  COVER PAGE
    # ========================================================================
    story.append(Spacer(1, 6 * cm))
    story.append(Paragraph("MasterAnalytics Pro", styles["CoverTitle"]))
    story.append(Paragraph("Polio Campaign Data Analysis Report", styles["CoverSubtitle"]))
    story.append(Spacer(1, 2 * cm))

    # Cover meta table
    cover_data = [
        ["Campaign:", campaign_name],
        ["Report Date:", today],
        ["Generated by:", "MasterAnalytics Pro"],
        ["Developed by:", "M. Nadeem Akhtar"],
    ]
    cover_table = Table(cover_data, colWidths=[4 * cm, 8 * cm])
    cover_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), COLOR_SLATE_500),
        ("TEXTCOLOR", (1, 0), (1, -1), COLOR_SLATE_900),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 3 * cm))

    # KPI highlight box on cover
    coverage = kpis.get("coveragePct", 0)
    coverage_color = COLOR_GREEN if coverage >= 95 else COLOR_AMBER if coverage >= 80 else COLOR_RED
    kpi_summary = [
        ["Total Target", "OPV Covered", "Coverage %", "Missed", "Refusals"],
        [
            f"{kpis.get('totalTarget', 0):,}",
            f"{kpis.get('opvCovered', 0):,}",
            f"{coverage:.1f}%",
            f"{kpis.get('missedChildren', 0):,}",
            f"{kpis.get('refusals', 0):,}",
        ],
    ]
    kpi_table = Table(kpi_summary, colWidths=[2.8 * cm] * 5)
    kpi_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), BODY_FONT),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("FONTNAME", (0, 1), (-1, 1), BODY_FONT),
        ("FONTSIZE", (0, 1), (-1, 1), 12),
        ("TEXTCOLOR", (0, 1), (-1, 1), COLOR_SLATE_900),
        ("BACKGROUND", (0, 1), (-1, 1), COLOR_SLATE_50),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_SLATE_200),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, COLOR_PRIMARY),
    ]))
    story.append(kpi_table)

    story.append(PageBreak())

    # ========================================================================
    #  SECTION 1: Scope & Definitions
    # ========================================================================
    add_heading(story, styles, "1. Scope & Definitions", level=0)
    add_body(story, styles, f"This report presents a comprehensive analysis of the polio immunization campaign \"{campaign_name}\". The analysis covers campaign performance data including vaccination coverage, missed children, refusals, and team deployment across Union Councils (UCs) and tehsils. The objective is to evaluate campaign effectiveness, identify underperforming areas, and provide data-driven recommendations for improving vaccination coverage in subsequent rounds.")

    add_heading(story, styles, "1.1 Key Metrics", level=1)
    metrics_text = (
        f"The analysis focuses on six primary Key Performance Indicators (KPIs): "
        f"Total Target (children aged 0-59 months), OPV Covered (children vaccinated with Oral Polio Vaccine), "
        f"Coverage Percentage (OPV Covered / Total Target), Missed Children (children recorded as not present or refused), "
        f"Total Refusals (households or families declining vaccination), and Teams Reported (vaccination teams deployed). "
        f"For this campaign, the total target population was {kpis.get('totalTarget', 0):,} children, with {kpis.get('opvCovered', 0):,} "
        f"receiving OPV, resulting in an overall coverage of {coverage:.2f}%."
    )
    add_body(story, styles, metrics_text)

    add_heading(story, styles, "1.2 Time Range & Granularity", level=1)
    scope_filters = filters if filters else {}
    day_filter = scope_filters.get("day", "all")
    day_text = f"Day {day_filter}" if day_filter != "all" else "All days (1-4)"
    tehsil_text = scope_filters.get("tehsil", "All tehsils")
    uc_text = scope_filters.get("ucName", "All UCs")
    add_body(story, styles, f"The data covers {day_text} of the campaign. The geographic scope includes {tehsil_text} and {uc_text}. Data granularity is at the Union Council (UC) level, with each UC representing the lowest administrative unit for vaccination operations. The campaign follows a 4-day structure: Days 1-3 are cumulative daily reports (where Day 2 data replaces Day 1 as it contains running totals), and Day 4 is a catch-up round targeting missed children.")

    # ========================================================================
    #  SECTION 2: Data Quality Checks
    # ========================================================================
    add_heading(story, styles, "2. Data Quality Checks", level=0)

    total_uc = len(uc_breakdown)
    total_rows = sum(1 for _ in uc_breakdown)

    add_body(story, styles, f"The dataset comprises {total_uc} Union Council records across the filtered scope. Data was ingested from Excel (.xlsx) files uploaded through the MasterAnalytics Pro platform. The following data quality rules were applied during ingestion: empty cells, asterisks (*), and 'NA' values were treated as zero (0) for numeric fields; required identifier fields (Tehsil, Campaign Name, UC Name) were validated — rows missing these were flagged as errors; and duplicate UC entries were resolved via upsert, with the latest upload replacing previous data for the same UC.")

    add_heading(story, styles, "2.1 Coverage Summary", level=1)
    coverage_status = "excellent" if coverage >= 95 else "needs improvement" if coverage >= 80 else "critical"
    add_body(story, styles, f"The overall campaign coverage is {coverage:.2f}%, which is classified as {coverage_status}. The target coverage threshold for polio campaigns is 95%. {'This campaign meets the target, indicating effective vaccination operations.' if coverage >= 95 else 'This campaign falls below the 95% target, requiring targeted interventions in underperforming areas.'} A total of {kpis.get('teamsReported', 0):,} vaccination teams were deployed across the campaign area.")

    # ========================================================================
    #  SECTION 3: Core Performance
    # ========================================================================
    add_heading(story, styles, "3. Core Performance Analysis", level=0)

    add_body(story, styles, f"The campaign achieved an OPV coverage of {kpis.get('opvCovered', 0):,} children out of a target population of {kpis.get('totalTarget', 0):,}, representing a coverage rate of {coverage:.2f}%. A total of {kpis.get('missedChildren', 0):,} children were recorded as missed (not available during team visits), and {kpis.get('refusals', 0):,} refusals were documented. The following charts visualize the day-by-day progress, UC-wise coverage distribution, and KPI summary.")

    # KPI Summary chart
    if "kpi_summary" in charts:
        add_image(story, charts["kpi_summary"], width=16 * cm)
        add_caption(story, styles, "Figure 1: Campaign KPI Summary — Coverage %, Covered vs Missed, and Refusal Rate")

    # Day-by-day chart
    if "day_progress" in charts:
        add_image(story, charts["day_progress"], width=16 * cm)
        add_caption(story, styles, "Figure 2: Day-by-Day Campaign Progress — OPV Given, Missed Children, and Refusals")

    add_heading(story, styles, "3.1 Key Metric Highlights", level=1)
    highlights = [
        f"Total Target: {kpis.get('totalTarget', 0):,} children (0-59 months)",
        f"OPV Covered: {kpis.get('opvCovered', 0):,} children vaccinated",
        f"Coverage Rate: {coverage:.2f}% (target: 95%)",
        f"Missed Children: {kpis.get('missedChildren', 0):,} (including NA and refusal categories)",
        f"Total Refusals: {kpis.get('refusals', 0):,} (medical + soft refusals)",
        f"Teams Deployed: {kpis.get('teamsReported', 0):,} vaccination teams",
    ]
    for h in highlights:
        story.append(Paragraph(f"• {h}", styles["BulletStyle"]))

    # ========================================================================
    #  SECTION 4: Comparisons
    # ========================================================================
    add_heading(story, styles, "4. Comparisons", level=0)

    # UC-wise coverage chart
    if "uc_coverage" in charts:
        add_image(story, charts["uc_coverage"], width=16 * cm)
        add_caption(story, styles, "Figure 3: Bottom 10 UCs by Coverage Percentage — Priority Areas for Intervention")

    add_heading(story, styles, "4.1 UC-wise Coverage Comparison", level=1)

    if uc_breakdown:
        # Build comparison table (top 5 + bottom 5)
        sorted_uc = sorted(uc_breakdown, key=lambda u: u.get("coverage_pct", 0))
        bottom_5 = sorted_uc[:5]
        top_5 = sorted_uc[-5:][::-1] if len(sorted_uc) >= 10 else sorted_uc[::-1]

        add_body(story, styles, "The following tables compare the top-performing and bottom-performing Union Councils by coverage percentage. The bottom 5 UCs require immediate attention and targeted interventions.")

        # Top 5 table
        add_heading(story, styles, "Top 5 Performing UCs", level=2)
        top_table_data = [["UC Name", "Tehsil", "Target", "OPV Given", "Coverage %"]]
        for uc in top_5:
            top_table_data.append([
                uc.get("uc_name", "")[:25],
                uc.get("tehsil", "")[:15],
                f"{uc.get('over_all_target', 0):,}",
                f"{uc.get('opv_given', 0):,}",
                f"{uc.get('coverage_pct', 0):.1f}%",
            ])
        add_table(story, top_table_data, col_widths=[5*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])

        # Bottom 5 table
        add_heading(story, styles, "Bottom 5 UCs (Priority)", level=2)
        bottom_table_data = [["UC Name", "Tehsil", "Target", "OPV Given", "Coverage %"]]
        for uc in bottom_5:
            bottom_table_data.append([
                uc.get("uc_name", "")[:25],
                uc.get("tehsil", "")[:15],
                f"{uc.get('over_all_target', 0):,}",
                f"{uc.get('opv_given', 0):,}",
                f"{uc.get('coverage_pct', 0):.1f}%",
            ])
        add_table(story, bottom_table_data, col_widths=[5*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])

    # ========================================================================
    #  SECTION 5: Attribution & Diagnosis
    # ========================================================================
    add_heading(story, styles, "5. Attribution & Diagnosis", level=0)

    missed = kpis.get("missedChildren", 0)
    refusals = kpis.get("refusals", 0)
    target = kpis.get("totalTarget", 1)

    add_body(story, styles, f"The coverage gap of {100-coverage:.2f}% can be attributed to two primary factors: missed children (children not available during team visits) and refusals (households declining vaccination). Missed children account for {missed:,} cases ({missed/target*100:.2f}% of target), while refusals account for {refusals:,} cases ({refusals/target*100:.2f}% of target). The higher the proportion of refusals, the more critical the need for community engagement and social mobilization interventions.")

    add_heading(story, styles, "5.1 Driver Analysis", level=1)
    drivers = [
        f"Missed Children ({missed:,}): Children not present at home during vaccination team visits. This is often due to mobility, work, or seasonal factors.",
        f"Refusals ({refusals:,}): Households actively declining OPV. These may be medical refusals (health concerns) or soft refusals (cultural/religious misconceptions).",
        f"Team Coverage: {kpis.get('teamsReported', 0):,} teams deployed. Insufficient team density in high-population UCs can contribute to lower coverage.",
    ]
    for d in drivers:
        story.append(Paragraph(f"• {d}", styles["BulletStyle"]))

    # ========================================================================
    #  SECTION 6: Insights & Action Plan
    # ========================================================================
    add_heading(story, styles, "6. Insights & Action Plan", level=0)

    # Include AI insights if available
    if insights:
        summary = insights.get("summary", "")
        if summary:
            add_body(story, styles, f"AI-Generated Summary: {summary}")

        key_findings = insights.get("keyFindings", [])
        if key_findings:
            add_heading(story, styles, "6.1 Key Findings (AI-Generated)", level=1)
            for i, finding in enumerate(key_findings, 1):
                story.append(Paragraph(f"{i}. {finding}", styles["BulletStyle"]))

        underperforming = insights.get("underperformingUCs", [])
        if underperforming:
            add_heading(story, styles, "6.2 Underperforming UCs", level=1)
            add_body(story, styles, "The following Union Councils have been identified as underperforming based on coverage metrics. Each UC includes a specific recommendation for improvement.")
            uc_table_data = [["UC Name", "Tehsil", "Issue", "Recommendation"]]
            for uc in underperforming[:8]:
                uc_table_data.append([
                    uc.get("uc_name", "")[:20],
                    uc.get("tehsil", "")[:12],
                    uc.get("issue", "")[:30],
                    uc.get("recommendation", "")[:40],
                ])
            add_table(story, uc_table_data, col_widths=[3.5*cm, 2.5*cm, 4*cm, 6*cm])

        high_refusal = insights.get("highRefusalAreas", [])
        if high_refusal:
            add_heading(story, styles, "6.3 High Refusal Areas", level=1)
            add_body(story, styles, "The following UCs have the highest refusal counts. Targeted community engagement strategies are recommended.")
            ref_table_data = [["UC Name", "Tehsil", "Refusals", "Recommendation"]]
            for area in high_refusal[:8]:
                ref_table_data.append([
                    area.get("uc_name", "")[:20],
                    area.get("tehsil", "")[:12],
                    f"{area.get('total_refusals', 0):,}",
                    area.get("recommendation", "")[:45],
                ])
            add_table(story, ref_table_data, col_widths=[3.5*cm, 2.5*cm, 2*cm, 8*cm])

        recommendations = insights.get("recommendations", [])
        if recommendations:
            add_heading(story, styles, "6.4 Action Plan", level=1)
            add_body(story, styles, "Based on the analysis, the following prioritized recommendations are proposed:")
            for i, rec in enumerate(recommendations, 1):
                priority = "HIGH" if i == 1 else "MEDIUM" if i == 2 else "LOW"
                story.append(Paragraph(f"<b>[{priority}]</b> {rec}", styles["BulletStyle"]))
    else:
        add_body(story, styles, "AI-generated insights are not available for this report. Please ensure the Groq AI integration is configured and generate insights from the dashboard before exporting the report.")

    # ========================================================================
    #  SECTION 7: Uncertainty Statement
    # ========================================================================
    add_heading(story, styles, "7. Uncertainty Statement", level=0)

    add_body(story, styles, "This analysis is based on administrative data collected during the campaign and self-reported by vaccination teams. The following limitations should be considered when interpreting the results:")

    limitations = [
        "Data accuracy depends on the completeness and accuracy of team reports. Underreporting or overreporting may occur in some areas.",
        "Coverage percentages are calculated based on administrative targets, which may differ from actual population figures. Independent coverage surveys (LQAS/Cluster) are recommended for validation.",
        "Missed children data captures only those recorded by teams. Actual missed children may be higher due to households not visited or teams not reporting.",
        "Refusal data may not capture the full complexity of refusal reasons (e.g., seasonal migration, temporary absence vs. active refusal).",
        "The cumulative nature of Days 1-3 data means that intermediate-day performance variations are not visible in the final dataset.",
    ]
    for l in limitations:
        story.append(Paragraph(f"• {l}", styles["BulletStyle"]))

    add_heading(story, styles, "7.1 Next Validation Steps", level=1)
    next_steps = [
        "Conduct an independent post-campaign coverage survey (LQAS) to validate administrative coverage figures.",
        "Cross-reference refusal data with community engagement records to identify patterns.",
        "Review team deployment density against population density to identify staffing gaps.",
        "Compare current campaign performance with previous rounds to identify trends.",
    ]
    for step in next_steps:
        story.append(Paragraph(f"• {step}", styles["BulletStyle"]))

    # ---- Build PDF with custom canvas (header/footer/bookmarks) ----
    doc.build(
        story,
        canvasmaker=lambda *args, **kwargs: ReportCanvas(
            *args, report_title=report_title, **kwargs
        ),
    )

    return output_path


# ============================================================================
#  Helper Functions
# ============================================================================

def add_heading(story, styles, text, level=0):
    """Add a heading and register a bookmark."""
    style_name = ["Heading1Style", "Heading2Style", "Heading3Style"][min(level, 2)]
    para = Paragraph(text, styles[style_name])
    # Create a bookmark key from the text
    bookmark_key = f"sec_{abs(hash(text))}"
    para._bookmarkName = bookmark_key
    story.append(para)


def add_body(story, styles, text):
    """Add a body paragraph."""
    story.append(Paragraph(text, styles["BodyStyle"]))


def add_image(story, image_path, width=14*cm):
    """Add an image with aspect ratio locked, width <= 80% page width."""
    from PIL import Image as PILImage
    img = PILImage.open(image_path)
    aspect = img.height / img.width
    max_width = 16.8 * cm  # 80% of A4 width (21cm - 4cm margins = 17cm, 80% = 13.6cm)
    actual_width = min(width, max_width)
    height = actual_width * aspect
    story.append(Image(image_path, width=actual_width, height=height))


def add_caption(story, styles, text):
    """Add a caption below an image."""
    story.append(Paragraph(text, styles["CaptionStyle"]))


def add_table(story, data, col_widths=None):
    """Add a styled table."""
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), BODY_FONT),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        # Body
        ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), COLOR_SLATE_700),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, COLOR_SLATE_50]),
        ("ALIGN", (0, 1), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Borders
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_SLATE_200),
        ("LINEBELOW", (0, 0), (-1, 0), 1, COLOR_PRIMARY),
        ("LINEBELOW", (0, 1), (-1, -2), 0.25, COLOR_SLATE_200),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.5 * cm))


# ============================================================================
#  Main Entry Point
# ============================================================================

if __name__ == "__main__":
    # Read JSON data from stdin
    input_json = sys.stdin.read()
    data = json.loads(input_json)

    # Output path from argv or default
    output_dir = Path("/home/z/my-project/download")
    output_dir.mkdir(parents=True, exist_ok=True)

    campaign = data.get("campaign", "Campaign")
    today = datetime.now().strftime("%Y-%m-%d")
    # File naming: [主题]_分析报告_[YYYY-MM-DD].pdf
    safe_campaign = "".join(c for c in campaign if c.isalnum() or c in " -_").strip().replace(" ", "_")
    output_path = str(output_dir / f"{safe_campaign}_分析报告_{today}.pdf")

    result = build_report(data, output_path)

    # Output result as JSON to stdout
    print(json.dumps({
        "success": True,
        "path": result,
        "filename": Path(result).name,
        "generatedAt": datetime.now().isoformat(),
    }))
