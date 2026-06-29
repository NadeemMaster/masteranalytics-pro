// ============================================================================
//  MasterAnalytics Pro — PDF Chart Components (SVG-based)
//  Renders charts directly in the PDF using @react-pdf/renderer SVG primitives.
//  No matplotlib/Python needed — 100% Vercel-compatible.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import React from "react";
import { Svg, Rect, Text, Line, Path, Circle, G, View, StyleSheet } from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
//  Color palette (matches dashboard theme)
// ---------------------------------------------------------------------------

export const CHART_COLORS = {
  blue: "#2563eb",
  cyan: "#06b6d4",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#8b5cf6",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  slate50: "#f8fafc",
  white: "#ffffff",
} as const;

// Type for SVG text style (react-pdf SVG Text uses style prop for font properties)
type SvgTextStyle = {
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fill?: string;
  textAnchor?: "start" | "middle" | "end";
};

// ---------------------------------------------------------------------------
//  Bar Chart — Day-by-Day Progress
// ---------------------------------------------------------------------------

export interface DayBarChartProps {
  data: Array<{
    day: number;
    opv_given: number;
    missed_children: number;
    refusals: number;
  }>;
  width?: number;
  height?: number;
}

export function DayBarChart({ data, width = 500, height = 220 }: DayBarChartProps) {
  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.opv_given, d.missed_children, d.refusals]),
    1
  );

  const barGroupWidth = chartW / data.length;
  const barWidth = (barGroupWidth - 10) / 3;

  const yScale = (val: number) => (val / maxValue) * chartH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(maxValue * t),
    y: padding.top + chartH - chartH * t,
  }));

  const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  const titleStyle: SvgTextStyle = {
    fontSize: 11,
    fontWeight: "bold",
    fill: CHART_COLORS.slate900,
    textAnchor: "middle",
  };
  const labelStyle: SvgTextStyle = {
    fontSize: 7,
    fill: CHART_COLORS.slate500,
    textAnchor: "end",
  };
  const dayLabelStyle: SvgTextStyle = {
    fontSize: 8,
    fill: CHART_COLORS.slate700,
    textAnchor: "middle",
  };
  const legendStyle: SvgTextStyle = { fontSize: 7, fill: CHART_COLORS.slate700 };

  return (
    <Svg width={width} height={height}>
      {/* Title */}
      <Text x={width / 2} y={12} style={titleStyle}>
        Day-by-Day Campaign Progress
      </Text>

      {/* Y-axis grid lines + labels */}
      {ticks.map((tick, i) => (
        <G key={`tick-${i}`}>
          <Line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke={CHART_COLORS.slate200}
            strokeWidth={0.5}
          />
          <Text x={padding.left - 5} y={tick.y + 3} style={labelStyle}>
            {formatNum(tick.value)}
          </Text>
        </G>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const groupX = padding.left + i * barGroupWidth + 5;
        return (
          <G key={`bar-${i}`}>
            <Rect
              x={groupX}
              y={padding.top + chartH - yScale(d.opv_given)}
              width={barWidth}
              height={yScale(d.opv_given)}
              fill={CHART_COLORS.blue}
            />
            <Rect
              x={groupX + barWidth + 2}
              y={padding.top + chartH - yScale(d.missed_children)}
              width={barWidth}
              height={yScale(d.missed_children)}
              fill={CHART_COLORS.amber}
            />
            <Rect
              x={groupX + 2 * (barWidth + 2)}
              y={padding.top + chartH - yScale(d.refusals)}
              width={barWidth}
              height={yScale(d.refusals)}
              fill={CHART_COLORS.red}
            />
            <Text
              x={groupX + (3 * barWidth + 4) / 2}
              y={height - padding.bottom + 15}
              style={dayLabelStyle}
            >
              Day {d.day}
            </Text>
          </G>
        );
      })}

      {/* Legend */}
      <Rect x={padding.left} y={height - 8} width={8} height={8} fill={CHART_COLORS.blue} />
      <Text x={padding.left + 11} y={height - 1} style={legendStyle}>
        OPV Given
      </Text>
      <Rect x={padding.left + 75} y={height - 8} width={8} height={8} fill={CHART_COLORS.amber} />
      <Text x={padding.left + 86} y={height - 1} style={legendStyle}>
        Missed
      </Text>
      <Rect x={padding.left + 140} y={height - 8} width={8} height={8} fill={CHART_COLORS.red} />
      <Text x={padding.left + 151} y={height - 1} style={legendStyle}>
        Refusals
      </Text>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
//  Horizontal Bar Chart — UC-wise Coverage (Bottom 10)
// ---------------------------------------------------------------------------

export interface UcCoverageChartProps {
  data: Array<{
    uc_name: string;
    coverage_pct: number;
  }>;
  width?: number;
  height?: number;
}

export function UcCoverageChart({
  data,
  width = 500,
  height = 280,
}: UcCoverageChartProps) {
  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a.coverage_pct - b.coverage_pct);
  const bottom = sorted.slice(0, 10);

  const padding = { top: 25, right: 50, bottom: 25, left: 110 };
  const chartW = width - padding.left - padding.right;
  const barHeight = Math.min(
    18,
    (height - padding.top - padding.bottom) / bottom.length - 4
  );
  const gap = 4;

  const colorForCoverage = (pct: number) => {
    if (pct < 60) return CHART_COLORS.red;
    if (pct < 80) return CHART_COLORS.amber;
    return CHART_COLORS.green;
  };

  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  const titleStyle: SvgTextStyle = {
    fontSize: 11,
    fontWeight: "bold",
    fill: CHART_COLORS.slate900,
    textAnchor: "middle",
  };
  const ucLabelStyle: SvgTextStyle = {
    fontSize: 7,
    fill: CHART_COLORS.slate700,
    textAnchor: "end",
  };
  const valueStyle: SvgTextStyle = { fontSize: 7, fill: CHART_COLORS.slate900 };
  const targetLabelStyle: SvgTextStyle = {
    fontSize: 6,
    fill: CHART_COLORS.green,
    textAnchor: "middle",
  };

  return (
    <Svg width={width} height={height}>
      {/* Title */}
      <Text x={width / 2} y={12} style={titleStyle}>
        Bottom {bottom.length} UCs by Coverage %
      </Text>

      {/* 95% target line */}
      {(() => {
        const targetX = padding.left + (95 / 100) * chartW;
        return (
          <G>
            <Line
              x1={targetX}
              y1={padding.top - 5}
              x2={targetX}
              y2={padding.top + bottom.length * (barHeight + gap)}
              stroke={CHART_COLORS.green}
              strokeWidth={0.5}
              strokeDasharray="3 2"
            />
            <Text x={targetX} y={padding.top - 8} style={targetLabelStyle}>
              95%
            </Text>
          </G>
        );
      })()}

      {/* Bars */}
      {bottom.map((uc, i) => {
        const y = padding.top + i * (barHeight + gap);
        const barW = (uc.coverage_pct / 100) * chartW;
        const color = colorForCoverage(uc.coverage_pct);
        return (
          <G key={`uc-${i}`}>
            <Text
              x={padding.left - 5}
              y={y + barHeight / 2 + 2}
              style={ucLabelStyle}
            >
              {truncate(uc.uc_name, 18)}
            </Text>
            <Rect
              x={padding.left}
              y={y}
              width={chartW}
              height={barHeight}
              fill={CHART_COLORS.slate200}
            />
            <Rect x={padding.left} y={y} width={barW} height={barHeight} fill={color} />
            <Text
              x={padding.left + barW + 3}
              y={y + barHeight / 2 + 2}
              style={valueStyle}
            >
              {uc.coverage_pct.toFixed(1)}%
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
//  Donut Chart — Single metric (e.g., Coverage %)
// ---------------------------------------------------------------------------

export interface DonutChartProps {
  value: number; // 0-100
  label: string;
  color?: string;
  size?: number;
}

export function DonutChart({
  value,
  label,
  color = CHART_COLORS.blue,
  size = 100,
}: DonutChartProps) {
  const radius = size / 2;
  const strokeWidth = size * 0.18;
  const innerRadius = radius - strokeWidth;

  // Calculate arc path
  const angle = (value / 100) * 360;
  const startAngle = -90; // start from top
  const endAngle = startAngle + angle;

  const polarToCartesian = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = polarToCartesian(radius, radius, innerRadius, startAngle);
  const end = polarToCartesian(radius, radius, innerRadius, endAngle);
  const largeArc = angle > 180 ? 1 : 0;

  const arcPath = `M ${start.x} ${start.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  const valueStyle: SvgTextStyle = {
    fontSize: Math.round(size * 0.16),
    fontWeight: "bold",
    fill: CHART_COLORS.slate900,
    textAnchor: "middle",
  };
  const labelStyle: SvgTextStyle = {
    fontSize: 9,
    fill: CHART_COLORS.slate500,
    textAnchor: "middle",
  };

  return (
    <Svg width={size} height={size + 20}>
      {/* Background circle */}
      <Circle
        cx={radius}
        cy={radius}
        r={innerRadius}
        stroke={CHART_COLORS.slate200}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Filled arc */}
      {value > 0 && (
        <Path
          d={arcPath}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Center text */}
      <Text x={radius} y={radius + 4} style={valueStyle}>
        {value.toFixed(1)}%
      </Text>
      {/* Label */}
      <Text x={radius} y={size + 14} style={labelStyle}>
        {label}
      </Text>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
//  KPI Summary — 3 donut charts side by side
// ---------------------------------------------------------------------------

export interface KpiSummaryChartProps {
  coveragePct: number;
  covered: number;
  missed: number;
  refusalRate: number;
  width?: number;
}

export function KpiSummaryChart({
  coveragePct,
  covered,
  missed,
  refusalRate,
}: KpiSummaryChartProps) {
  const donutSize = 90;

  const coveredPct =
    covered + missed > 0 ? (covered / (covered + missed)) * 100 : 0;

  // Use a View wrapper (not Svg) so each DonutChart is an independent SVG.
  // Nested <Svg> inside <Svg> is not supported by @react-pdf/renderer.
  const kpiSummaryStyles = StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: 20,
    },
    title: {
      fontSize: 11,
      fontWeight: "bold",
      color: CHART_COLORS.slate900,
      textAlign: "center",
      marginBottom: 8,
    },
  });

  return (
    <View>
      <Text style={kpiSummaryStyles.title}>Campaign KPI Summary</Text>
      <View style={kpiSummaryStyles.container}>
        <DonutChart
          value={coveragePct}
          label="Coverage %"
          color={CHART_COLORS.blue}
          size={donutSize}
        />
        <DonutChart
          value={coveredPct}
          label="Covered vs Missed"
          color={CHART_COLORS.green}
          size={donutSize}
        />
        <DonutChart
          value={Math.min(refusalRate, 100)}
          label="Refusal Rate %"
          color={CHART_COLORS.red}
          size={donutSize}
        />
      </View>
    </View>
  );
}
