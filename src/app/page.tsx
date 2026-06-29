// ============================================================================
//  MasterAnalytics Pro — Landing Page
//  Public marketing page that showcases the product and drives users to the
//  dashboard via /login (middleware auto-redirects authenticated users to
//  /dashboard, so the CTA works for both logged-in and logged-out visitors).
//
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Security } from "@/components/landing/security";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <HowItWorks />
        <Security />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
