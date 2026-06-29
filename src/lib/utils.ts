import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert an arbitrary cell value (from Excel/CSV) into a safe number.
 * Treats empty strings, "*", "NA", "N/A", "null", "undefined" as 0.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  if (raw === "" || raw === "*" || raw === "-" || raw === "N/A" || raw === "NA") {
    return 0;
  }
  const cleaned = raw.replace(/,/g, "").replace(/%/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert a value to a nullable number (keeps null instead of 0).
 */
export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (raw === "" || raw === "*" || raw === "-" || raw === "N/A" || raw === "NA") {
    return null;
  }
  const cleaned = raw.replace(/,/g, "").replace(/%/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convert a value to a trimmed string, treating "*" as empty.
 */
export function toCleanString(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (raw === "*" || raw === "N/A" || raw === "NA") return "";
  return raw;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
