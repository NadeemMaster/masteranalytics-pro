import { CalendarDays, FileText, Sparkles, Users } from "lucide-react";

const STATS = [
  {
    keyword: "4-Day",
    label: "Campaign Cycle Tracking",
    icon: CalendarDays,
  },
  {
    keyword: "UC-Level",
    label: "Granular Coverage Data",
    icon: Users,
  },
  {
    keyword: "AI-Powered",
    label: "Groq LLaMA-3.3 Insights",
    icon: Sparkles,
  },
  {
    keyword: "PDF",
    label: "Professional Report Export",
    icon: FileText,
  },
];

export function StatsBar() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <stat.icon className="h-5 w-5" />
              </span>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                {stat.keyword}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
