"use client";

// ============================================================================
//  MasterAnalytics Pro — AI Insights Card
//  Fetches and displays Groq LLaMA-3 analysis of campaign data.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
//  Types — mirror the /api/ai-insights response
// ---------------------------------------------------------------------------

interface AiInsights {
  summary: string;
  keyFindings: string[];
  underperformingUCs: Array<{
    uc_name: string;
    tehsil: string;
    issue: string;
    metric: string;
    recommendation: string;
  }>;
  highRefusalAreas: Array<{
    uc_name: string;
    tehsil: string;
    total_refusals: number;
    refusal_type: string;
    recommendation: string;
  }>;
  recommendations: string[];
}

interface InsightsResponse {
  success: boolean;
  campaign: string;
  insights: AiInsights;
  generatedAt: string;
  error?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------

export function AiInsightsCard({
  campaign,
  tehsil,
  ucName,
  day,
}: {
  campaign: string;
  tehsil?: string;
  ucName?: string;
  day: number | "all";
}) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!campaign || loading) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ campaign });
      if (tehsil) params.set("tehsil", tehsil);
      if (ucName) params.set("uc", ucName);
      params.set("day", String(day));

      const res = await fetch(`/api/ai-insights?${params.toString()}`);
      const data: InsightsResponse = await res.json();

      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`;
        if (res.status === 404) {
          setError("No data found for the selected filters. Upload campaign data first.");
        } else if (res.status === 502) {
          setError(`AI service error: ${data.detail || msg}`);
        } else {
          setError(msg);
        }
        toast.error("AI analysis failed", { description: msg });
        return;
      }

      setInsights(data.insights);
      setGeneratedAt(data.generatedAt);
      toast.success("AI insights generated!", {
        description: "Analysis ready below.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      toast.error("Failed to generate insights", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [campaign, tehsil, ucName, day, loading]);

  // ---- Empty state ----
  if (!insights && !loading && !error) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Sparkles className="h-7 w-7 text-blue-600" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">
              AI-Powered Campaign Insights
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Generate an AI analysis of your campaign data — underperforming
              UCs, high-refusal areas, and actionable recommendations powered by
              Groq LLaMA-3.
            </p>
          </div>
          <Button
            onClick={generate}
            disabled={!campaign}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
          >
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
          {!campaign && (
            <p className="text-xs text-amber-600">
              Select a campaign first to enable AI analysis.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Analyzing campaign data…
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Error state ----
  if (error && !insights) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">
              Analysis failed
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">{error}</p>
          </div>
          <Button variant="outline" onClick={generate}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- Results ----
  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* Header card with summary + regenerate */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </span>
              <div>
                <CardTitle className="text-base">AI Campaign Analysis</CardTitle>
                {generatedAt && (
                  <p className="text-xs text-slate-500">
                    Generated {new Date(generatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generate}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700">
            {insights.summary}
          </p>
        </CardContent>
      </Card>

      {/* Key findings */}
      {insights.keyFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.keyFindings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-semibold text-green-700">
                    {i + 1}
                  </span>
                  <span className="text-slate-700">{finding}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Two-column: underperforming UCs + high refusal areas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Underperforming UCs */}
        {insights.underperformingUCs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-5 w-5 text-amber-600" />
                Underperforming UCs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.underperformingUCs.map((uc, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-100 bg-amber-50/50 p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium text-slate-900">
                      {uc.uc_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({uc.tehsil})
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">{uc.issue}:</span>{" "}
                    <Badge variant="warning" className="ml-1">
                      {uc.metric}
                    </Badge>
                  </p>
                  <p className="mt-1.5 text-sm text-slate-700">
                    💡 {uc.recommendation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* High refusal areas */}
        {insights.highRefusalAreas.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                High Refusal Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.highRefusalAreas.map((area, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-red-100 bg-red-50/50 p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                    <span className="font-medium text-slate-900">
                      {area.uc_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({area.tehsil})
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Refusals:</span>{" "}
                    <Badge variant="destructive" className="ml-1">
                      {area.total_refusals.toLocaleString()}
                    </Badge>
                    <span className="ml-2 text-xs text-slate-500">
                      ({area.refusal_type})
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm text-slate-700">
                    💡 {area.recommendation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {insights.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-red-100 text-red-700"
                        : i === 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
