// ============================================================================
//  MasterAnalytics Pro — Dashboard (placeholder; full build in Step 6)
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Link from "next/link";
import { Activity, Upload, BarChart3, Sparkles, FileText } from "lucide-react";

import { requireUser } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      status: "done",
      href: "/upload",
    },
    {
      icon: BarChart3,
      label: "Step 6 — Dashboard",
      desc: "Filters, KPI cards, Recharts",
      status: "pending",
      href: null,
    },
    {
      icon: Sparkles,
      label: "Step 7 — AI Insights",
      desc: "Groq LLaMA-3 analysis",
      status: "pending",
      href: null,
    },
    {
      icon: FileText,
      label: "Step 8 — PDF Report",
      desc: "A4 report with bookmarks",
      status: "pending",
      href: null,
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
            const isDone = s.status === "done";
            return (
              <Card key={s.label} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        isDone
                          ? "bg-green-50 text-green-600"
                          : "bg-blue-50 text-blue-600"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        isDone
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {isDone ? "Ready" : "Pending"}
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
                Upload your campaign reports
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                The Excel parser is ready — upload your Day 1-4{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                  .xlsx
                </code>{" "}
                files. Days 1-3 are cumulative (latest replaces previous), Day 4
                goes to the catch-up table.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                Upload Excel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
