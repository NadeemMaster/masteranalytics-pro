// ============================================================================
//  MasterAnalytics Pro — Excel Header Normalizer
//  Converts messy Excel column names into stable lookup keys.
//  Author: M. Nadeem Akhtar (https://www.facebook.com/itxmasterjee)
// ============================================================================

/**
 * Normalize an Excel header into a stable lookup key.
 *
 * Rules:
 *  1. Lowercase
 *  2. Remove ALL whitespace (spaces, tabs, newlines — handles "Over all \nTarget")
 *  3. Remove every character EXCEPT: letters, digits, underscore, and %
 *     (keeping % lets us disambiguate "Admin Coverage" from "Admin Coverage %")
 *
 * Examples:
 *   "Over all \nTarget"                       → "overalltarget"
 *   "Admin Coverage"                          → "admincoverage"
 *   "Admin Coverage %"                        → "admincoverage%"
 *   "MMP Registration:"                       → "mmpregistration"
 *   "0/0 Houses"                              → "00houses"
 *   "# of Finger markers issued"              → "offingermarkersissued"
 *   "MMP missed children FROM EXISITING REGISTRATION:" → "mmpmissedchildrenfromexisitingregistration"
 *   "TARGET HH  0-59"                         → "targethh059"
 *   "1ST VISIT COVERAGE HH 0-59"              → "1stvisitcoveragehh059"
 */
export function normalizeHeader(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .toLowerCase()
    .replace(/\s+/g, "") // strip all whitespace incl. newlines
    .replace(/[^\w%]/g, ""); // keep word chars + % only
}

/**
 * Build a reverse lookup: normalized header → original header (first match wins).
 * Used to detect which physical Excel column each logical field maps to.
 */
export function buildHeaderIndex(headers: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key && !map.has(key)) {
      map.set(key, i);
    }
  });
  return map;
}
