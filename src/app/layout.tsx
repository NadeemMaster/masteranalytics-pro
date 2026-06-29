import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "MasterAnalytics Pro — Polio Campaign Dashboard",
    template: "%s | MasterAnalytics Pro",
  },
  description:
    "MasterAnalytics Pro — comprehensive analytics dashboard for polio immunization campaign data with AI-powered insights.",
  authors: [{ name: "M. Nadeem Akhtar", url: "https://www.facebook.com/itxmasterjee" }],
  keywords: [
    "polio campaign",
    "analytics dashboard",
    "vaccination coverage",
    "SIA report",
    "MasterAnalytics Pro",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
