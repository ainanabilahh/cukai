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

describe("file path safety", () => {
  it("only treats app-created file names as deletable", async () => {
    const { isAppFilePath } = await import("@/lib/files");
    const id = "0b8f5a4e-3c2d-4e1f-9a7b-6c5d4e3f2a1b";
    expect(isAppFilePath(`2025/receipts/receipt-${id}.png`)).toBe(true);
    expect(isAppFilePath(`2025/ea-form/ea-form-${id}.pdf`)).toBe(true);
    expect(isAppFilePath("Taxes2023/notes.docx")).toBe(false);
    expect(isAppFilePath(`../receipt-${id}.jpg`)).toBe(false);
    expect(isAppFilePath(`/Users/me/receipt-${id}.jpg`)).toBe(false);
  });

  it("drops receipt paths the app did not create on import", () => {
    const id = "0b8f5a4e-3c2d-4e1f-9a7b-6c5d4e3f2a1b";
    const { items } = parseImportedDeductions([{
      category: "Lifestyle", amount: 1, date: "", description: "x", frequency: "yearly",
      receiptImages: ["Taxes2023/notes.docx", `2025/receipts/receipt-${id}.jpg`, "data:image/png;base64,AA"],
    }]);
    expect(items[0].receiptImages).toEqual([`2025/receipts/receipt-${id}.jpg`, "data:image/png;base64,AA"]);
  });
});

describe("file helpers", () => {
  it("reads data URL types safely", async () => {
    const { dataUrlType, fileExtension } = await import("@/lib/files");
    expect(dataUrlType("data:image/png;base64,AA")).toEqual({ mime: "image/png", ext: "png" });
    expect(dataUrlType("data:image/png,%89PNG")?.ext).toBe("png");
    expect(dataUrlType("not a data url")).toBeNull();
    expect(fileExtension({ type: "image/avif" })).toBe("avif");
    expect(fileExtension({ type: "", name: "scan.PDF" })).toBe("pdf");
  });

  it("lets a sheet year turn shared limits off", () => {
    const sheet = parseRatesSheet("year,type,category,limit\n2026,shared,none,\n");
    expect(resolveRates(sheet, 2026).shared).toEqual([]);
  });
});
