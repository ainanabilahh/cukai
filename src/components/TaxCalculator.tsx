import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateTax, formatRM } from "@/lib/tax-calculator";
import { ResolvedRates } from "@/lib/tax-rates";

interface TaxCalculatorProps {
  year: number;
  eaIncome: number | null; // sum of this year's EA forms, when entered
  eaPcb: number | null;
  totalReliefs: number; // already capped at category and shared limits, excluding zakat
  overLimit: number; // amount claimed above category limits (not counted)
  zakatAmount: number;
  rates: ResolvedRates;
}

// Figures typed over the EA totals are remembered per year on this device
const overridesKey = (year: number) => `cukai.taxInputs.${year}`;
type Overrides = { income?: string; pcb?: string };

function loadOverrides(year: number): Overrides {
  try { return JSON.parse(localStorage.getItem(overridesKey(year)) ?? "{}"); } catch { return {}; }
}

function saveOverrides(year: number, value: Overrides) {
  try { localStorage.setItem(overridesKey(year), JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function TaxCalculator({ year, eaIncome, eaPcb, totalReliefs, overLimit, zakatAmount, rates }: TaxCalculatorProps) {
  const [overrides, setOverrides] = useState<Overrides>(() => loadOverrides(year));
  const [showBrackets, setShowBrackets] = useState(false);
  useEffect(() => setOverrides(loadOverrides(year)), [year]);

  const setOverride = (key: keyof Overrides, value: string | undefined) => {
    const next = { ...overrides, [key]: value };
    if (value === undefined || value.trim() === "") delete next[key]; // clearing goes back to the EA total
    setOverrides(next);
    saveOverrides(year, next);
  };

  // Typed figures win; otherwise use the EA forms' totals
  const totalIncome = overrides.income ?? (eaIncome !== null ? String(eaIncome) : "");
  const pcbPaid = overrides.pcb ?? (eaPcb !== null ? String(eaPcb) : "");

  const income = parseFloat(totalIncome) || 0;
  const pcb = parseFloat(pcbPaid) || 0;

  const result = useMemo(
    () => calculateTax(income, totalReliefs, zakatAmount, pcb, rates.brackets),
    [income, totalReliefs, zakatAmount, pcb, rates.brackets]
  );

  const hasInput = income > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Tax estimate
          <Badge variant="secondary" className="text-xs font-normal" title={rates.source === "sheet" ? "Rates from your Google Sheet" : "Built-in rates"}>
            YA {rates.year} rates{rates.source === "sheet" ? " · sheet" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="totalIncome" className="text-sm">Annual Income (RM)</Label>
            <Input
              id="totalIncome"
              type="number"
              placeholder="e.g. 79033"
              value={totalIncome}
              onChange={(e) => setOverride("income", e.target.value)}
              min={0}
            />
            <SourceHint typed={overrides.income !== undefined} eaValue={eaIncome} onReset={() => setOverride("income", undefined)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcbPaid" className="text-sm">PCB Paid (RM)</Label>
            <Input
              id="pcbPaid"
              type="number"
              placeholder="e.g. 3263.65"
              value={pcbPaid}
              onChange={(e) => setOverride("pcb", e.target.value)}
              min={0}
            />
            <SourceHint typed={overrides.pcb !== undefined} eaValue={eaPcb} onReset={() => setOverride("pcb", undefined)} />
          </div>
        </div>

        {hasInput && (
          <>
            <Separator />

            {/* Computation Summary */}
            <div className="space-y-3">
              <SummaryRow label="Total Income" value={result.totalIncome} />
              <SummaryRow label="Total Reliefs (capped at limits)" value={-result.totalReliefs} className="text-muted-foreground" />
              {overLimit > 0 && (
                <p className="text-xs text-muted-foreground -mt-2">
                  RM {formatRM(overLimit)} claimed above LHDN limits isn't counted.
                </p>
              )}
              <Separator />
              <SummaryRow label="Chargeable Income" value={result.chargeableIncome} bold />

              {/* Bracket breakdown toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-muted-foreground"
                onClick={() => setShowBrackets(!showBrackets)}
              >
                Tax bracket breakdown
                {showBrackets ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              {showBrackets && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  {result.bracketBreakdown.length > 0 ? (
                    result.bracketBreakdown.map((b, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          RM {formatRM(b.taxable)} @ {b.rate}%
                        </span>
                        <span>RM {formatRM(b.tax)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">No taxable amount</p>
                  )}
                </div>
              )}

              <SummaryRow label="Tax Before Rebate" value={result.taxBeforeRebate} />

              {/* Rebates */}
              {(result.rebates.self > 0 || result.rebates.zakat > 0) && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rebates</p>
                  {result.rebates.self > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Self (income ≤ RM35k)</span>
                      <span>-RM {formatRM(result.rebates.self)}</span>
                    </div>
                  )}
                  {result.rebates.zakat > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Zakat & Fitrah</span>
                      <span>-RM {formatRM(result.rebates.zakat)}</span>
                    </div>
                  )}
                </div>
              )}

              <SummaryRow label="Tax Payable" value={result.taxAfterRebate} bold />

              {pcb > 0 && (
                <>
                  <SummaryRow label="PCB Paid" value={-result.pcbPaid} className="text-muted-foreground" />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.balancePayable > 0 ? (
                        <ArrowUpCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm font-semibold font-display">
                        {result.balancePayable > 0 ? "Balance to Pay" : "Refund Due"}
                      </span>
                    </div>
                    <span className={`text-lg font-bold font-display ${result.balancePayable > 0 ? "text-destructive" : "text-success"}`}>
                      RM {formatRM(Math.abs(result.balancePayable))}
                    </span>
                  </div>
                </>
              )}

              {/* Effective Rate */}
              <div className="pt-2">
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Effective Tax Rate</span>
                  <span className="text-sm font-semibold text-primary">{result.effectiveRate}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Says where a figure came from, with a way back to the EA total after typing over it. */
function SourceHint({ typed, eaValue, onReset }: { typed: boolean; eaValue: number | null; onReset: () => void }) {
  if (eaValue === null) {
    return <p className="text-xs text-muted-foreground">Add amounts to your EA forms to fill this in automatically</p>;
  }
  if (!typed) return <p className="text-xs text-muted-foreground">From this year's EA forms</p>;
  return (
    <p className="text-xs text-muted-foreground">
      Edited.{" "}
      <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={onReset}>
        Use EA total (RM {formatRM(eaValue)})
      </button>
    </p>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: number;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between text-sm ${className ?? ""}`}>
      <span className={bold ? "font-semibold font-display" : ""}>{label}</span>
      <span className={bold ? "font-semibold font-display" : ""}>
        {value < 0 ? "-" : ""}RM {formatRM(Math.abs(value))}
      </span>
    </div>
  );
}
