import { useState, useMemo } from "react";
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
  totalReliefs: number; // already capped at category and shared limits, excluding zakat
  overLimit: number; // amount claimed above category limits (not counted)
  zakatAmount: number;
  rates: ResolvedRates;
}

export function TaxCalculator({ totalReliefs, overLimit, zakatAmount, rates }: TaxCalculatorProps) {
  const [totalIncome, setTotalIncome] = useState<string>("");
  const [pcbPaid, setPcbPaid] = useState<string>("");
  const [showBrackets, setShowBrackets] = useState(false);

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
              onChange={(e) => setTotalIncome(e.target.value)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">From EA form or total employment income</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcbPaid" className="text-sm">PCB Paid (RM)</Label>
            <Input
              id="pcbPaid"
              type="number"
              placeholder="e.g. 3263.65"
              value={pcbPaid}
              onChange={(e) => setPcbPaid(e.target.value)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">Monthly tax deductions from salary</p>
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
