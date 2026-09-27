import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { calculateTax, TAX_BRACKETS } from "@/lib/tax-calculator";
import { parseCsv, parseRatesSheet, resolveRates, capReliefs, BUILT_IN_RATES } from "@/lib/tax-rates";

const template = readFileSync(path.resolve(__dirname, "../../docs/tax-rates-template.csv"), "utf8");

describe("calculateTax", () => {
  it("matches the YA 2025 schedule at bracket edges", () => {
    expect(calculateTax(5000, 0, 0, 0).taxBeforeRebate).toBe(0);
    expect(calculateTax(20000, 0, 0, 0).taxBeforeRebate).toBe(150);
    expect(calculateTax(35000, 0, 0, 0).taxBeforeRebate).toBe(600);
    expect(calculateTax(50000, 0, 0, 0).taxBeforeRebate).toBe(1500);
    expect(calculateTax(70000, 0, 0, 0).taxBeforeRebate).toBe(3700);
    expect(calculateTax(100000, 0, 0, 0).taxBeforeRebate).toBe(9400);
    expect(calculateTax(400000, 0, 0, 0).taxBeforeRebate).toBe(84400);
  });

  it("matches the cumulative tax listed on every bracket", () => {
    for (const [i, b] of TAX_BRACKETS.entries()) {
      if (i === 0) continue;
      expect(calculateTax(b.min - 1, 0, 0, 0).taxBeforeRebate).toBe(b.cumulativeTax);
    }
  });

  it("applies self rebate and caps zakat at tax owed", () => {
    const r = calculateTax(30000, 0, 5000, 0);
    expect(r.taxBeforeRebate).toBe(450);
    expect(r.rebates.self).toBe(400);
    expect(r.rebates.zakat).toBe(450);
    expect(r.taxAfterRebate).toBe(0);
  });

  it("gives the same result with contiguous brackets (0-5000, 5000-20000)", () => {
    const contiguous = [
      { min: 0, max: 5000, rate: 0 },
      { min: 5000, max: 20000, rate: 1 },
      { min: 20000, max: Infinity, rate: 3 },
    ];
    expect(calculateTax(30000, 0, 0, 0, contiguous).taxBeforeRebate).toBe(450);
  });
});

describe("rates sheet", () => {
  it("parses quoted fields and CRLF", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([["a", "b, c", 'd "e"'], ["1", "2", "3"]]);
  });

  it("round-trips the template to the built-in rates", () => {
    const rates = resolveRates(parseRatesSheet(template), 2025);
    expect(rates.source).toBe("sheet");
    expect(rates.limits).toEqual(BUILT_IN_RATES.limits);
    expect(rates.shared).toEqual(BUILT_IN_RATES.shared);
    expect(rates.brackets.map(({ min, max, rate }) => ({ min, max, rate }))).toEqual(
      TAX_BRACKETS.map(({ min, max, rate }) => ({ min, max, rate })),
    );
  });

  it("has LHDN's older rates in the template", () => {
    const sheet = parseRatesSheet(template);
    const ya2022 = resolveRates(sheet, 2022);
    // LHDN YA 2022 schedule: RM1,800 on the first 50k, RM10,700 on the first 100k, RM46,700 on the first 250k
    expect(calculateTax(50000, 0, 0, 0, ya2022.brackets).taxBeforeRebate).toBe(1800);
    expect(calculateTax(100000, 0, 0, 0, ya2022.brackets).taxBeforeRebate).toBe(10700);
    expect(calculateTax(250000, 0, 0, 0, ya2022.brackets).taxBeforeRebate).toBe(46700);
    expect(resolveRates(sheet, 2024).limits["Disabled Spouse"]).toBe(5000);
    expect(resolveRates(sheet, 2024).limits["Housing Loan Interest"]).toBe(0);
    expect(resolveRates(sheet, 2021).limits["SOCSO / EIS"]).toBe(250);
  });

  it("uses the latest earlier year, and built-in rates when none apply", () => {
    const sheet = parseRatesSheet("year,type,category,limit\n2026,relief,Lifestyle,3000\n");
    expect(resolveRates(sheet, 2027).year).toBe(2026);
    expect(resolveRates(sheet, 2027).limits["Lifestyle"]).toBe(3000);
    expect(resolveRates(sheet, 2027).limits["Medical Expenses"]).toBe(10000);
    expect(resolveRates(sheet, 2025).source).toBe("built-in");
    expect(resolveRates(null, 2026).source).toBe("built-in");
  });

  it("reads RM and comma formatted numbers, blank limit as no limit", () => {
    const sheet = parseRatesSheet('Year,Type,Category,Limit\n2026,relief,Lifestyle,"RM 2,500"\n2026,relief,Donations,\n');
    const { limits } = resolveRates(sheet, 2026);
    expect(limits["Lifestyle"]).toBe(2500);
    expect(limits["Donations"]).toBe(Infinity);
  });

  it("rejects a sheet without year/type columns", () => {
    expect(() => parseRatesSheet("foo,bar\n1,2\n")).toThrow();
  });
});

describe("capReliefs", () => {
  it("caps each category and leaves zakat out", () => {
    const { total, excess } = capReliefs(
      { Lifestyle: 4000, "Medical Expenses": 2000, Zakat: 1000, Donations: 500 },
      BUILT_IN_RATES.limits,
    );
    expect(total).toBe(2500 + 2000 + 500);
    expect(excess).toBe(1500);
  });

  it("applies the shared medical limit on top of each category's own limit", () => {
    const totals = { "Medical Expenses": 9000, "Learning Disability": 5000 };
    expect(capReliefs(totals, BUILT_IN_RATES.limits).total).toBe(14000);
    const { total, excess } = capReliefs(totals, BUILT_IN_RATES.limits, BUILT_IN_RATES.shared);
    expect(total).toBe(10000);
    expect(excess).toBe(4000);
  });

  it("reads shared limits from the sheet", () => {
    const sheet = parseRatesSheet("year,type,category,limit\n2026,shared,Lifestyle + Additional Lifestyle,3000\n");
    expect(resolveRates(sheet, 2026).shared).toEqual([{ categories: ["Lifestyle", "Additional Lifestyle"], limit: 3000 }]);
  });
});
