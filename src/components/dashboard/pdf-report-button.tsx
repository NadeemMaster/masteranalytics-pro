"use client";

// ============================================================================
//  MasterAnalytics Pro — PDF Report Export Button
//  Triggers /api/generate-report which builds an A4 PDF with charts,
//  bookmarks, headers/footers via Python (reportlab).
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useState, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function PdfReportButton({
  campaign,
  tehsil,
  ucName,
  day,
  disabled,
}: {
  campaign: string;
  tehsil?: string;
  ucName?: string;
  day: number | "all";
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!campaign || loading) return;

    setLoading(true);
    const toastId = toast.loading("Generating PDF report…", {
      description: "This includes charts, AI insights, and all 7 analysis sections. May take 30-60 seconds.",
    });

    try {
      const params = new URLSearchParams({ campaign });
      if (tehsil) params.set("tehsil", tehsil);
      if (ucName) params.set("uc", ucName);
      params.set("day", String(day));
      params.set("ai", "true");

      const res = await fetch(`/api/generate-report?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      // The response is the PDF file itself
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Get filename from Content-Disposition header
      const contentDisp = res.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisp.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `Polio_Campaign_Analysis_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF report downloaded!", {
        id: toastId,
        description: filename,
        duration: 6000,
      });
    } catch (err) {
      toast.error("Report generation failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again.",
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  }, [campaign, tehsil, ucName, day, loading]);

  return (
    <Button
      variant="outline"
      onClick={generate}
      disabled={disabled || loading || !campaign}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Export PDF Report
        </>
      )}
    </Button>
  );
}
