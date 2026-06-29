import {
  BarChart3,
  FileText,
  GitCompareArrows,
  Sparkles,
  TrendingUp,
  UploadCloud,
} from "lucide-react";

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Excel Upload & Auto-Parsing",
    description:
      "Upload .xlsx daily and catch-up reports with drag-and-drop. Headers are auto-normalized and mapped to the correct database columns — no manual formatting needed.",
  },
  {
    icon: BarChart3,
    title: "Interactive KPI Dashboard",
    description:
      "Real-time KPI cards with day, tehsil, and UC filters. Drill down into coverage rates, team allocation, refusal tracking, and more — all in one view.",
  },
  {
    icon: TrendingUp,
    title: "Day-by-Day Progress Charts",
    description:
      "Recharts visualizations track coverage progression across Days 1–4. Spot trends early and identify where the campaign is falling behind.",
  },
  {
    icon: GitCompareArrows,
    title: "UC-wise Coverage Comparison",
    description:
      "Side-by-side Union Council performance breakdown. Compare coverage, refusals, and team efficiency across UCs to prioritize field interventions.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description:
      "Groq LLaMA-3.3 analyzes your campaign data and surfaces trends, risk areas, and actionable recommendations — so you can act fast.",
  },
  {
    icon: FileText,
    title: "Professional PDF Reports",
    description:
      "Generate a 7-section analysis report with charts and KPIs in one click. Ready to share with stakeholders, supervisors, and field teams.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        {/* Section heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to track{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              campaign performance
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From raw Excel uploads to AI-driven insights and shareable PDF
            reports — MasterAnalytics Pro covers the entire analytics pipeline.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white">
                <feature.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
