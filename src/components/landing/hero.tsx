import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: Copy */}
          <div className="flex flex-col items-start gap-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              Polio SIA Campaign Analytics
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn Campaign Data into{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Actionable Intelligence
              </span>
            </h1>

            {/* Subheadline */}
            <p className="max-w-xl text-lg text-slate-600">
              Upload your daily and catch-up Excel reports, visualize coverage
              across Union Councils, get AI-powered insights to identify
              underperforming areas, and export professional PDF reports — all
              in one platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/login">
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
                <a href="#features">Explore Features</a>
              </Button>
            </div>

            {/* Mini trust line */}
            <p className="text-sm text-slate-500">
              No credit card required · Secure Supabase authentication · RLS
              data isolation
            </p>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur">
              {/* Mock header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    Campaign Overview
                  </span>
                </div>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  Day 3 Active
                </span>
              </div>

              {/* Mock KPI cards */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Coverage", value: "87.4%", icon: TrendingUp, tone: "text-blue-600" },
                  { label: "UCs Tracked", value: "142", icon: Users, tone: "text-cyan-600" },
                  { label: "Refusals", value: "23", icon: FileText, tone: "text-amber-600" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <kpi.icon className={`h-4 w-4 ${kpi.tone}`} />
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {kpi.value}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {kpi.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mock bar chart */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Day-by-Day Progress
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="flex h-32 items-end justify-between gap-2">
                  {[
                    { day: "Day 1", h: "45%" },
                    { day: "Day 2", h: "68%" },
                    { day: "Day 3", h: "87%" },
                    { day: "Day 4", h: "95%" },
                  ].map((bar) => (
                    <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex h-full w-full items-end">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400"
                          style={{ height: bar.h }}
                        />
                      </div>
                      <span className="text-[9px] font-medium text-slate-500">
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock upload hint */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                <UploadCloud className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-500">
                  Drag & drop your .xlsx report to import
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
