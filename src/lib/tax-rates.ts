// Per-year relief limits and tax brackets.
// Rates can come from a Google Sheet published as CSV (see docs/tax-rates-template.csv);
// the built-in YA 2025 values are used when no sheet is set or a year is missing from it.

import { CATEGORY_LIMITS } from "@/lib/deduction-data";
import { TAX_BRACKETS, TaxBracket } from "@/lib/tax-calculator";

export interface SharedLimit {
  categories: string[];
  limit: number;
}

export interface YearRates {
  limits: Record<string, number>; // Infinity = no limit
  brackets: TaxBracket[];
  shared: SharedLimit[]; // categories that also share one combined limit
}

export interface ResolvedRates extends YearRates {
  year: number; // the year of assessment the rates were taken from
  source: "sheet" | "built-in";
}

export const BUILT_IN_YEAR = 2025;

export const BUILT_IN_RATES: YearRates = {
  limits: { ...CATEGORY_LIMITS },
  brackets: TAX_BRACKETS,
  // Serious illness, fertility, vaccination, dental, check-ups and learning disability share RM10,000
  shared: [{ categories: ["Medical Expenses", "Learning Disability"], limit: 10000 }],
};

// Zakat is a rebate against tax, not a relief against income.
export const REBATE_CATEGORIES = new Set(["Zakat"]);

/** Minimal CSV parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/[,\sRM%]/gi, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses the rates sheet. Columns (header row, any order, case-insensitive):
 *   year | type | category | limit | from | to | rate
 * type "relief":  category + limit (blank limit = no limit)
 * type "bracket": from + to (blank to = no upper bound) + rate (percent)
 * type "shared":  category lists categories joined with " + ", limit is their combined cap
 */
export function parseRatesSheet(csv: string): Map<number, Partial<YearRates>> {
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new Error("The sheet is empty.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = { year: col("year"), type: col("type"), category: col("category"), limit: col("limit"), from: col("from"), to: col("to"), rate: col("rate") };
  if (idx.year < 0 || idx.type < 0) throw new Error('The sheet needs "year" and "type" columns.');

  const byYear = new Map<number, Partial<YearRates>>();
  const get = (year: number) => {
    if (!byYear.has(year)) byYear.set(year, {});
    return byYear.get(year)!;
  };

  for (const r of rows.slice(1)) {
    const year = toNumber(r[idx.year]);
    const type = r[idx.type]?.trim().toLowerCase();
    if (year === null || !type) continue;

    if (type === "relief") {
      const category = r[idx.category]?.trim();
      if (!category) continue;
      const limit = toNumber(r[idx.limit]);
      const entry = get(year);
      entry.limits = { ...entry.limits, [category]: limit ?? Infinity };
    } else if (type === "bracket") {
      const from = toNumber(r[idx.from]);
      const rate = toNumber(r[idx.rate]);
      if (from === null || rate === null) continue;
      const to = toNumber(r[idx.to]);
      const entry = get(year);
      entry.brackets = [...(entry.brackets ?? []), { min: from, max: to ?? Infinity, rate }];
    } else if (type === "shared") {
      const categories = (r[idx.category] ?? "").split("+").map((c) => c.trim()).filter(Boolean);
      const limit = toNumber(r[idx.limit]);
      if (categories.length < 2 || limit === null) continue;
      const entry = get(year);
      entry.shared = [...(entry.shared ?? []), { categories, limit }];
    }
  }

  for (const entry of byYear.values()) entry.brackets?.sort((a, b) => a.min - b.min);
  return byYear;
}

/**
 * Picks the rates for a year of assessment: the sheet's rows for that year,
 * or the latest earlier year in the sheet, otherwise the built-in YA 2025 rates.
 * Categories missing from the sheet keep their built-in limit; shared limits come
 * only from the sheet once a year is in it.
 */
export function resolveRates(sheet: Map<number, Partial<YearRates>> | null, year: number): ResolvedRates {
  const years = sheet ? [...sheet.keys()].filter((y) => y <= year).sort((a, b) => b - a) : [];
  const picked = years[0];
  if (picked === undefined || !sheet) {
    return { ...BUILT_IN_RATES, year: BUILT_IN_YEAR, source: "built-in" };
  }
  const entry = sheet.get(picked)!;
  return {
    limits: { ...BUILT_IN_RATES.limits, ...entry.limits },
    brackets: entry.brackets && entry.brackets.length > 0 ? entry.brackets : BUILT_IN_RATES.brackets,
    shared: entry.shared ?? [],
    year: picked,
    source: "sheet",
  };
}

export function limitFor(limits: Record<string, number>, category: string): number {
  return limits[category] ?? Infinity;
}

/**
 * Sums reliefs with each category capped at its own limit, then each shared group
 * capped at its combined limit. Rebate categories (Zakat) are left out.
 */
export function capReliefs(
  totalByCategory: Record<string, number>,
  limits: Record<string, number>,
  shared: SharedLimit[] = [],
) {
  const allowed: Record<string, number> = {};
  let claimed = 0;
  for (const [category, amount] of Object.entries(totalByCategory)) {
    if (REBATE_CATEGORIES.has(category)) continue;
    claimed += amount;
    allowed[category] = Math.min(amount, limitFor(limits, category));
  }

  let total = Object.values(allowed).reduce((sum, a) => sum + a, 0);
  for (const group of shared) {
    const groupTotal = group.categories.reduce((sum, c) => sum + (allowed[c] ?? 0), 0);
    total -= Math.max(0, groupTotal - group.limit);
  }
  return { total, excess: claimed - total };
}
