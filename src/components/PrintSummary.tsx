import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deduction } from "@/lib/deduction-data";
import { limitFor } from "@/lib/tax-rates";
import { useTaxRates } from "@/contexts/TaxRatesContext";

interface Props {
  deductions: Deduction[];
  totalByCategory: Record<string, number>;
  total: number;
  year: number;
}

export function PrintSummary({ deductions, totalByCategory, total, year }: Props) {
  const { limits } = useTaxRates(year);
  const handlePrint = () => {
    const entries = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);
    const fmt = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cukai. Tax Claim Summary - YA ${year}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
          th { background: #f5f5f5; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { font-size: 14px; }
          .amount { text-align: right; font-family: monospace; }
          .total-row { font-weight: 700; background: #f0f0ff; }
          .over-limit { color: #dc2626; }
          .section-title { font-size: 18px; margin: 30px 0 12px; border-bottom: 2px solid #1a1a2e; padding-bottom: 6px; }
          .footer { margin-top: 40px; font-size: 12px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Cukai<span style="color:#d9892f">.</span> Tax Claim Summary</h1>
        <p class="subtitle">Year of Assessment ${year} &bull; Generated ${new Date().toLocaleDateString("en-MY")}</p>

        <h2 class="section-title">Category Summary</h2>
        <table>
          <thead><tr><th>Category</th><th class="amount">Claimed</th><th class="amount">Limit</th><th class="amount">Status</th></tr></thead>
          <tbody>
            ${entries.map(([cat, amount]) => {
              const limit = limitFor(limits, cat);
              const isOver = limit !== Infinity && amount > limit;
              return `<tr>
                <td>${cat}</td>
                <td class="amount ${isOver ? 'over-limit' : ''}">${fmt(amount)}</td>
                <td class="amount">${limit === Infinity ? 'No limit' : fmt(limit)}</td>
                <td class="amount ${isOver ? 'over-limit' : ''}">${isOver ? '⚠ Over limit' : '✓'}</td>
              </tr>`;
            }).join("")}
            <tr class="total-row">
              <td>Total</td>
              <td class="amount" colspan="3">${fmt(total)}</td>
            </tr>
          </tbody>
        </table>

        <h2 class="section-title">Deduction Details (${deductions.length} entries)</h2>
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="amount">Amount</th></tr></thead>
          <tbody>
            ${deductions.map((d) => `<tr>
              <td>${d.date}</td>
              <td>${d.category}</td>
              <td>${d.description}</td>
              <td class="amount">${fmt(d.amount)}</td>
            </tr>`).join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a personal record summary. Please verify all figures with official LHDN documentation before filing.</p>
        </div>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
      <Printer className="h-3.5 w-3.5" /> Print Summary
    </Button>
  );
}
