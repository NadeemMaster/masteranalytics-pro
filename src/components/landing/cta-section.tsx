import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20">
          {/* Decorative blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your campaign data?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-50">
              Sign in to upload your reports, visualize coverage, get AI
              insights, and export professional PDFs — all in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                <Link href="/login">
                  <LayoutDashboard className="h-5 w-5" />
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/signup">Create an Account</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-blue-100">
              No credit card required · Get started in under a minute
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
