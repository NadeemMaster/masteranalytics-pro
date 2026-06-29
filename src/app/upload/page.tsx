// ============================================================================
//  MasterAnalytics Pro — Upload Page (Server Component shell)
//  Renders the branded header + the client upload form.
//  Route is protected by middleware (PROTECTED_PREFIXES includes "/upload").
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Link from "next/link";
import { Activity, ArrowLeft, Info, Upload } from "lucide-react";

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
import { UploadForm } from "./upload-form";

export const metadata = { title: "Upload Report" };

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
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
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </Button>
            <UserMenu email={user.email} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Title row */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Upload Campaign Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload your Day 1–4 Excel reports. The parser auto-detects the day
            column and routes each row to the correct table.
          </p>
        </div>

        {/* Info banner */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                How cumulative uploads work
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-slate-600">
                <li>
                  <strong>Days 1–3 are cumulative:</strong> uploading Day 2 for a
                  UC <em>replaces</em> its Day 1 row (latest wins).
                </li>
                <li>
                  <strong>Day 4</strong> rows go to the separate catch-up table.
                </li>
                <li>
                  Values like <code className="rounded bg-white px-1">*</code>,{" "}
                  <code className="rounded bg-white px-1">NA</code>, or empty
                  cells are cleaned to <code className="rounded bg-white px-1">0</code>.
                </li>
                <li>
                  Accepted: <code className="rounded bg-white px-1">.xlsx</code> /{" "}
                  <code className="rounded bg-white px-1">.xls</code> up to 10 MB.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Excel File
            </CardTitle>
            <CardDescription>
              Drag & drop or click to browse. Only one file per upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
