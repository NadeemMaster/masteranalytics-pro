import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
            Step 5 Complete — Upload &amp; Excel Parser Ready
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            MasterAnalytics
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {" "}Pro
            </span>
          </h1>

          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Polio Campaign Data Analytics Dashboard
          </p>

          <p className="max-w-2xl text-lg text-slate-600">
            A full-stack analytics platform for polio immunization campaigns.
            Upload daily &amp; catch-up reports, visualize coverage across UCs,
            and get AI-powered insights to identify underperforming areas.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Next.js 15", desc: "App Router" },
              { label: "Supabase", desc: "Auth + RLS" },
              { label: "Recharts", desc: "Visualizations" },
              { label: "Groq AI", desc: "LLaMA-3.3" },
            ].map((t) => (
              <div
                key={t.label}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white/70 p-4 text-left backdrop-blur",
                  "shadow-sm transition hover:shadow-md"
                )}
              >
                <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                <p className="text-xs text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
              <span className="text-lg">🚧</span> Build Progress
            </h3>
            <ol className="space-y-1.5 text-sm text-amber-800">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Step 1 — Dependencies
                &amp; env template
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Step 2 — SQL schema
                &amp; RLS policies
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Step 3 — Supabase
                client utilities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Step 4 — Authentication
                UI &amp; callback
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Step 5 — File Upload +
                /api/upload
              </li>
              <li className="flex items-center gap-2 opacity-60">
                <span>○</span> Step 6 — Dashboard UI + charts
              </li>
              <li className="flex items-center gap-2 opacity-60">
                <span>○</span> Step 7 — Groq AI insights
              </li>
            </ol>
          </div>

          <div className="mt-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-900">
              📋 Next Action — Run the SQL in Supabase
            </h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
              <li>
                Open your Supabase project →{" "}
                <span className="font-medium">SQL Editor</span> → New query.
              </li>
              <li>
                Paste the contents of{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  /supabase/schema.sql
                </code>
                .
              </li>
              <li>Click Run. Tables + RLS policies will be created.</li>
              <li>
                Then go to{" "}
                <span className="font-medium">Authentication → Providers</span>{" "}
                and ensure <span className="font-medium">Email</span> is enabled.
              </li>
            </ol>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Configure your{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            with Supabase &amp; Groq credentials, then proceed to Step 3.
          </p>
        </div>
      </div>
    </main>
  );
}
