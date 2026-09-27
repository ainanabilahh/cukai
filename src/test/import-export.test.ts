import { describe, it, expect } from "vitest";
import { csvField, deductionsToCsv, parseImportedDeductions } from "@/lib/import-export";
import { escapeHtml } from "@/lib/utils";
import { resolveRates, parseRatesSheet, BUILT_IN_RATES } from "@/lib/tax-rates";

describe("parseImportedDeductions", () => {
  it("keeps valid rows and skips broken ones", () => {
    const { items, skipped } = parseImportedDeductions([
      { id: "x", category: "Lifestyle", amount: 120, date: "2025-03-01", description: "Book", frequency: "yearly" },
      { category: "Lifestyle", amount: 50, date: "2025-03-02", frequency: "yearly" }, // no description
      { category: "Not a category", amount: 1, date: "2025-01-01", description: "x", frequency: "yearly" },
      { category: "Medical Expenses", amount: "80.5", date: "2025-04-01", description: "Clinic", frequency: "monthly", month: "April" },
    ]);
    expect(items).toHaveLength(2);
    expect(items[1].amount).toBe(80.5);
    expect(skipped).toBe(2);
    expect(items[0]).not.toHaveProperty("id");
  });

  it("rejects a non-list", () => {
    expect(() => parseImportedDeductions({})).toThrow();
  });
});

describe("CSV export", () => {
  it("doubles quotes and neutralises formulas", () => {
    expect(csvField('12" monitor, stand')).toBe('"12"" monitor, stand"');
    expect(csvField("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
  });

  it("keeps one column per field", () => {
    const csv = deductionsToCsv([
      { id: "1", category: "Lifestyle", amount: 10, date: "2025-01-01", description: 'a "b", c', frequency: "yearly" },
    ]);
    expect(csv.split("\r\n")[1]).toBe('"Lifestyle","10.00","2025-01-01","a ""b"", c","yearly",""');
  });
});

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml('<img src=x onerror="a">')).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;");
  });
});

describe("shared limits fallback", () => {
  it("keeps the built-in medical shared cap when a sheet year has no shared rows", () => {
    const sheet = parseRatesSheet("year,type,category,limit\n2026,relief,Lifestyle,3000\n");
    expect(resolveRates(sheet, 2026).shared).toEqual(BUILT_IN_RATES.shared);
  });
});
