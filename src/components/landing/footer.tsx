import Link from "next/link";
import { Activity } from "lucide-react";

const TECH_BADGES = ["Next.js 15", "Supabase", "Recharts", "Groq LLaMA-3.3"];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 lg:flex-row lg:items-start">
          {/* Brand */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <Activity className="h-4 w-4" />
              </span>
              <span className="font-bold tracking-tight text-slate-900">
                MasterAnalytics{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Pro
                </span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              A comprehensive analytics platform for polio immunization
              campaign data — from Excel upload to AI insights and PDF reports.
            </p>
          </div>

          {/* Tech badges */}
          <div className="flex flex-col items-center gap-3 lg:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Built With
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TECH_BADGES.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
