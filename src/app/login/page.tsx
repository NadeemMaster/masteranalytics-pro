// ============================================================================
//  MasterAnalytics Pro — Login Page
//  Server Component shell — renders the client form and reads ?redirect= param.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import Link from "next/link";
import { Suspense } from "react";
import { Activity, ShieldCheck } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginShell />
    </Suspense>
  );
}

async function LoginShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              MasterAnalytics{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Pro
              </span>
            </span>
          </Link>
          <p className="mt-1 text-sm text-slate-500">
            Polio Campaign Analytics Dashboard
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your account to continue
            </p>
          </div>
          <LoginForm />

          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>
              Your data is isolated — RLS ensures only you see your uploads.
            </span>
          </div>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
