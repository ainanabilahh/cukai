import { CATEGORIES, Deduction, DeductionCategory } from "@/lib/deduction-data";

/** Checks rows from an exported JSON file; returns the valid ones and how many were skipped. */
export function parseImportedDeductions(data: unknown): { items: Omit<Deduction, "id">[]; skipped: number } {
  if (!Array.isArray(data)) throw new Error("Expected a list of deductions");
  const items: Omit<Deduction, "id">[] = [];
  let skipped = 0;
  for (const raw of data) {
    const r = raw as Record<string, unknown>;
    const amount = Number(r?.amount);
    const valid =
      r && typeof r === "object" &&
      CATEGORIES.includes(r.category as DeductionCategory) &&
      Number.isFinite(amount) && amount >= 0 &&
      typeof r.date === "string" && // yearly claims have an empty date

      typeof r.description === "string" &&
      (r.frequency === "yearly" || r.frequency === "monthly") &&
      (r.month === undefined || r.month === null || typeof r.month === "string") &&
      (r.receiptImages === undefined || (Array.isArray(r.receiptImages) && r.receiptImages.every((x) => typeof x === "string")));
    if (!valid) { skipped++; continue; }
    items.push({
      category: r.category as DeductionCategory,
      amount,
      date: r.date as string,
      description: r.description as string,
      frequency: r.frequency as Deduction["frequency"],
      month: (r.month as string | null) ?? undefined,
      receiptImages: r.receiptImages as string[] | undefined,
    });
  }
  return { items, skipped };
}

/** Quotes a CSV field, doubling quotes, and stops spreadsheets reading it as a formula. */
export function csvField(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function deductionsToCsv(deductions: Deduction[]): string {
  const headers = ["Category", "Amount", "Date", "Description", "Frequency", "Month"];
  const rows = deductions.map((d) =>
    [d.category, d.amount.toFixed(2), d.date, d.description, d.frequency, d.month ?? ""].map(csvField).join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}
