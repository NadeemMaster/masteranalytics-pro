// ============================================================================
//  MasterAnalytics Pro — Dashboard (placeholder; full build in Step 6)
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Link from "next/link";
import { Activity, Upload, BarChart3, Sparkles, FileText } from "lucide-react";

import { requireUser } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const steps = [
    {
      icon: Upload,
      label: "Step 5 — Upload",
      desc: "Excel parser + /api/upload route",
      status: "pending",
    },
    {
      icon: BarChart3,
      label: "Step 6 — Dashboard",
      desc: "Filters, KPI cards, Recharts",
      status: "pending",
    },
    {
      icon: Sparkles,
      label: "Step 7 — AI Insights",
      desc: "Groq LLaMA-3 analysis",
      status: "pending",
    },
    {
      icon: FileText,
      label: "Step 8 — PDF Report",
      desc: "A4 report with bookmarks",
      status: "pending",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
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
          <UserMenu email={user.email} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome back 👋
          </h1>
          <p className="mt-1 text-slate-500">
            You&apos;re signed in as{" "}
            <span className="font-medium text-slate-700">{user.email}</span>.
            Your campaign analytics will appear here once we finish the next
            steps.
          </p>
        </div>

        {/* Build status grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-sm">{s.label}</CardTitle>
                  <CardDescription className="text-xs">
                    {s.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <Card className="mt-8 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Ready to upload your first campaign report?
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                The upload UI + Excel parser will be built in Step 5 (next).
                Grab your{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                  .xlsx
                </code>{" "}
                Day 1-4 files now.
              </p>
            </div>
            <Button disabled className="shrink-0">
              <Upload className="h-4 w-4" />
              Upload (coming soon)
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
