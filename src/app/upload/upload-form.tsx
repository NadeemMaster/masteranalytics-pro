"use client";

// ============================================================================
//  MasterAnalytics Pro — Upload Form (Client Component)
//  Drag-and-drop + click-to-browse file picker that POSTs to /api/upload.
//  Renders a results card with per-table stats, skipped rows, and errors.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload as UploadIcon,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACCEPTED_EXT = [".xlsx", ".xls"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
//  Response shape from /api/upload (must stay in sync with the route handler)
// ---------------------------------------------------------------------------

interface UploadResult {
  success: boolean;
  fileName: string;
  sheetName: string;
  totalRows: number;
  daily: { parsed: number; upserted: number; error: string | null };
  catchup: { parsed: number; upserted: number; error: string | null };
  skipped: { rowNumber: number; reason: string }[];
  rowErrors: { rowNumber: number; reason: string }[];
  unmappedHeaders: string[];
  message: string;
}

type Phase = "idle" | "uploading" | "done" | "error";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ---- Validate the selected file before sending ----
  const validateFile = useCallback((file: File): string | null => {
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXT.some((ext) => lower.endsWith(ext))) {
      return `Unsupported file type. Accepted: ${ACCEPTED_EXT.join(", ")}.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`;
    }
    if (file.size === 0) {
      return "File is empty.";
    }
    return null;
  }, []);

  // ---- Upload the file to /api/upload ----
  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setPhase("uploading");
      setProgress(10);
      setErrorMsg(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress steps while the request is in flight.
        const tick = setInterval(() => {
          setProgress((p) => (p < 80 ? p + 10 : p));
        }, 400);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(tick);
        setProgress(100);

        const body = (await res.json().catch(() => null)) as
          | UploadResult
          | { error?: string }
          | null;

        if (!res.ok) {
          const msg =
            (body && "error" in body && body.error) ||
            `Upload failed (HTTP ${res.status}).`;
          setPhase("error");
          setErrorMsg(msg);
          toast.error("Upload failed", { description: msg });
          return;
        }

        const uploadResult = body as UploadResult;
        setResult(uploadResult);
        setPhase("done");

        if (uploadResult.success) {
          toast.success("Upload complete", {
            description: uploadResult.message,
          });
        } else {
          toast.warning("Upload completed with issues", {
            description: uploadResult.message,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error.";
        setPhase("error");
        setErrorMsg(msg);
        toast.error("Upload failed", { description: msg });
      }
    },
    [validateFile]
  );

  // ---- Input change handler ----
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      // Reset so selecting the same file again still fires onChange.
      e.target.value = "";
    },
    [uploadFile]
  );

  // ---- Drag-and-drop handlers ----
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setResult(null);
    setErrorMsg(null);
  }, []);

  // ===========================================================================
  //  Render
  // ===========================================================================

  // ---- Uploading state ----
  if (phase === "uploading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Uploading & parsing your file…</span>
        </div>
        <Progress value={progress} indicatorClassName="bg-blue-600" />
        <p className="text-xs text-slate-400">{progress}%</p>
      </div>
    );
  }

  // ---- Error state ----
  if (phase === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="font-semibold text-red-900">Upload failed</p>
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        </div>
        <Button onClick={reset} variant="outline">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  // ---- Done state: show results ----
  if (phase === "done" && result) {
    return <ResultsView result={result} onReset={reset} router={router} />;
  }

  // ---- Idle state: drop zone ----
  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT.join(",")}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <UploadCloud className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-900">
            Drag & drop your Excel file here
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            or <span className="text-blue-600 underline">click to browse</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>.xlsx / .xls — up to 10 MB</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Results view — stats grid + skipped/error tables + unmapped headers
// ---------------------------------------------------------------------------

interface ResultsViewProps {
  result: UploadResult;
  onReset: () => void;
  router: ReturnType<typeof useRouter>;
}

function ResultsView({ result, onReset, router }: ResultsViewProps) {
  const totalUpserted = result.daily.upserted + result.catchup.upserted;
  const totalIssues = result.skipped.length + result.rowErrors.length;
  const hasTableErrors = Boolean(result.daily.error || result.catchup.error);

  const tone = result.success
    ? "success"
    : hasTableErrors
      ? "destructive"
      : "warning";

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          tone === "success"
            ? "border-green-200 bg-green-50"
            : tone === "destructive"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        {tone === "success" ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="space-y-1">
          <p
            className={`font-semibold ${
              tone === "success" ? "text-green-900" : "text-amber-900"
            }`}
          >
            {result.success ? "Upload complete" : "Upload completed with issues"}
          </p>
          <p
            className={`text-sm ${
              tone === "success" ? "text-green-700" : "text-amber-700"
            }`}
          >
            {result.message}
          </p>
          <p className="text-xs text-slate-500">
            File: <span className="font-medium">{result.fileName}</span>
            {result.sheetName ? ` • Sheet: ${result.sheetName}` : ""}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total rows" value={result.totalRows} tone="slate" />
        <StatCard
          label="Daily upserted"
          value={result.daily.upserted}
          tone="blue"
        />
        <StatCard
          label="Catch-up upserted"
          value={result.catchup.upserted}
          tone="cyan"
        />
        <StatCard
          label="Skipped + errors"
          value={totalIssues}
          tone={totalIssues > 0 ? "amber" : "slate"}
        />
      </div>

      {/* Per-table errors */}
      {(result.daily.error || result.catchup.error) && (
        <div className="space-y-2">
          {result.daily.error && (
            <ErrorRow label="Daily table error" message={result.daily.error} />
          )}
          {result.catchup.error && (
            <ErrorRow
              label="Catch-up table error"
              message={result.catchup.error}
            />
          )}
        </div>
      )}

      {/* Unmapped headers */}
      {result.unmappedHeaders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Unmapped columns ({result.unmappedHeaders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-slate-500">
              These Excel columns were not recognized and were skipped. The
              rest of the row was still imported.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.unmappedHeaders.map((h, i) => (
                <Badge key={`${h}-${i}`} variant="warning">
                  {h}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skipped rows */}
      {result.skipped.length > 0 && (
        <RowTable
          title="Skipped rows"
          tone="amber"
          rows={result.skipped}
        />
      )}

      {/* Error rows */}
      {result.rowErrors.length > 0 && (
        <RowTable title="Row errors" tone="red" rows={result.rowErrors} />
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onReset} variant="outline">
          <RotateCcw className="h-4 w-4" />
          Upload another
        </Button>
        <Button
          onClick={() => router.push("/dashboard")}
          disabled={totalUpserted === 0}
        >
          <UploadIcon className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Small presentational helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "blue" | "cyan" | "amber";
}) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "cyan"
        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-700";
  return (
    <div className={`rounded-lg border p-3 ${toneClasses}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
    </div>
  );
}

function ErrorRow({ label, message }: { label: string; message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold text-red-900">{label}</p>
        <p className="text-red-700">{message}</p>
      </div>
    </div>
  );
}

function RowTable({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "amber" | "red";
  rows: { rowNumber: number; reason: string }[];
}) {
  const headerClass =
    tone === "red"
      ? "text-red-700"
      : "text-amber-700";
  return (
    <Card className={tone === "red" ? "border-red-200" : "border-amber-200"}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm ${headerClass}`}>
          {tone === "red" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Excel row</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.rowNumber}-${i}`}>
                  <TableCell className="font-mono text-xs">
                    {r.rowNumber}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {r.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
