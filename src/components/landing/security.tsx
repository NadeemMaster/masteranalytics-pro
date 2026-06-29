import { Database, KeyRound, ShieldCheck } from "lucide-react";

const SECURITY_POINTS = [
  {
    icon: KeyRound,
    title: "Supabase Authentication",
    description:
      "Secure email/password auth with session management. Every request is validated server-side — no client-trusted sessions.",
  },
  {
    icon: ShieldCheck,
    title: "Row-Level Security (RLS)",
    description:
      "PostgreSQL RLS policies enforce data isolation at the database level. Your campaign data is yours alone — no other user can access it.",
  },
  {
    icon: Database,
    title: "Server-Side Validation",
    description:
      "All uploads are validated on the server before reaching the database. File type, size, and row integrity are checked at every step.",
  },
];

export function Security() {
  return (
    <section id="security" className="scroll-mt-16 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: Highlight card */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-8 shadow-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl"
              />
              <div className="relative">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">
                  <ShieldCheck className="h-8 w-8" />
                </span>
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                  Your data is{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    isolated & secure
                  </span>
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  Bank-grade security with Supabase Row-Level Security (RLS).
                  Every upload is tied to your account — only you can view,
                  edit, or export your campaign data.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Security points */}
          <div className="flex flex-col gap-6">
            {SECURITY_POINTS.map((point) => (
              <div
                key={point.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <point.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
