import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = "https://masteranalytics-pro.vercel.app";
const ogImage = `${siteUrl}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MasterAnalytics Pro — Polio Campaign Analytics Dashboard",
    template: "%s | MasterAnalytics Pro",
  },
  description:
    "MasterAnalytics Pro — A comprehensive analytics dashboard for polio immunization campaign data. Upload Excel reports, visualize coverage across UCs, get AI-powered insights, and export professional PDF reports. Developed by M. Nadeem Akhtar.",
  keywords: [
    "polio campaign",
    "analytics dashboard",
    "vaccination coverage",
    "SIA report",
    "OPV coverage",
    "immunization data",
    "MasterAnalytics Pro",
    "M. Nadeem Akhtar",
    "campaign analytics",
    "public health dashboard",
  ],
  authors: [{ name: "M. Nadeem Akhtar", url: "https://www.facebook.com/itxmasterjee" }],
  creator: "M. Nadeem Akhtar",
  publisher: "M. Nadeem Akhtar",
  applicationName: "MasterAnalytics Pro",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "MasterAnalytics Pro — Polio Campaign Analytics Dashboard",
    description:
      "Comprehensive analytics dashboard for polio immunization campaign data with AI-powered insights and PDF report export. Developed by M. Nadeem Akhtar.",
    url: siteUrl,
    siteName: "MasterAnalytics Pro",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "MasterAnalytics Pro — Polio Campaign Analytics Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MasterAnalytics Pro — Polio Campaign Analytics",
    description:
      "Comprehensive analytics dashboard for polio immunization campaign data with AI-powered insights. Developed by M. Nadeem Akhtar.",
    images: [ogImage],
    creator: "@itxmasterjee",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: `${siteUrl}/manifest.json`,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "author": "M. Nadeem Akhtar",
    "developer": "M. Nadeem Akhtar",
    "contact": "https://www.facebook.com/itxmasterjee",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured data for search engine rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "MasterAnalytics Pro",
              description:
                "Comprehensive analytics dashboard for polio immunization campaign data with AI-powered insights and PDF report export.",
              url: siteUrl,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              author: {
                "@type": "Person",
                name: "M. Nadeem Akhtar",
                url: "https://www.facebook.com/itxmasterjee",
              },
              publisher: {
                "@type": "Person",
                name: "M. Nadeem Akhtar",
                url: "https://www.facebook.com/itxmasterjee",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Excel/CSV upload with automatic data cleaning",
                "Interactive dashboard with filters and KPI cards",
                "Day-by-day progress charts",
                "UC-wise coverage comparison",
                "AI-powered insights (Groq LLaMA-3)",
                "PDF report export with 7-section analysis",
                "Secure authentication with data isolation (RLS)",
              ],
            }),
          }}
        />
        {/* Author meta tag for search engine snippets */}
        <meta name="author" content="M. Nadeem Akhtar" />
        <meta name="developer" content="M. Nadeem Akhtar" />
        <meta
          name="description"
          content="MasterAnalytics Pro — Polio Campaign Analytics Dashboard. Upload Excel reports, visualize coverage, get AI insights, export PDF reports. Developed by M. Nadeem Akhtar."
        />
      </head>
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 bg-slate-50 py-4">
            <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-center text-sm text-slate-600 sm:flex-row sm:text-left">
              <p>
                <span className="font-semibold text-slate-800">
                  MasterAnalytics Pro
                </span>{" "}
                — Polio Campaign Analytics
              </p>
              <p>
                Developed by{" "}
                <a
                  href="https://www.facebook.com/itxmasterjee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                >
                  M. Nadeem Akhtar
                </a>
              </p>
            </div>
          </footer>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
