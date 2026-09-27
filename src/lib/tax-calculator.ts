// Malaysian Tax Brackets YA 2025 (Resident Individual)
// Based on LHDN BE Form Schedule 1 Part I

export interface TaxBracket {
  min: number;
  max: number;
  rate: number; // percentage
  cumulativeTax?: number; // tax on all brackets before this one
}

export const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 5000, rate: 0, cumulativeTax: 0 },
  { min: 5001, max: 20000, rate: 1, cumulativeTax: 0 },
  { min: 20001, max: 35000, rate: 3, cumulativeTax: 150 },
  { min: 35001, max: 50000, rate: 6, cumulativeTax: 600 },
  { min: 50001, max: 70000, rate: 11, cumulativeTax: 1500 },
  { min: 70001, max: 100000, rate: 19, cumulativeTax: 3700 },
  { min: 100001, max: 400000, rate: 25, cumulativeTax: 9400 },
  { min: 400001, max: 600000, rate: 26, cumulativeTax: 84400 },
  { min: 600001, max: 2000000, rate: 28, cumulativeTax: 136400 },
  { min: 2000001, max: Infinity, rate: 30, cumulativeTax: 528400 },
];

export interface TaxCalculationResult {
  totalIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  taxBeforeRebate: number;
  rebates: {
    self: number;
    spouse: number;
    zakat: number;
    total: number;
  };
  taxAfterRebate: number;
  pcbPaid: number;
  balancePayable: number; // positive = pay, negative = refund
  effectiveRate: number;
  bracketBreakdown: { bracket: string; taxable: number; rate: number; tax: number }[];
}

export function calculateTax(
  totalIncome: number,
  totalReliefs: number,
  zakat: number,
  pcbPaid: number,
  brackets: TaxBracket[] = TAX_BRACKETS,
): TaxCalculationResult {
  const chargeableIncome = Math.max(0, totalIncome - totalReliefs);

  // Calculate tax using brackets
  let taxBeforeRebate = 0;
  const bracketBreakdown: TaxCalculationResult["bracketBreakdown"]= [];

  for (const [i, bracket] of brackets.entries()) {
    // Each band starts where the previous one ended, so "5,001 - 20,000" and "5,000 - 20,000" both work
    const lower = i === 0 ? bracket.min : brackets[i - 1].max;
    if (chargeableIncome <= lower) break;

    const taxableInBracket = Math.min(chargeableIncome, bracket.max) - lower;

    if (taxableInBracket > 0) {
      const tax = (taxableInBracket * bracket.rate) / 100;
      taxBeforeRebate += tax;

      if (bracket.rate > 0) {
        bracketBreakdown.push({
          bracket: bracket.max === Infinity
            ? `>${formatRM(bracket.min - 1)}`
            : `${formatRM(bracket.min)} - ${formatRM(bracket.max)}`,
          taxable: taxableInBracket,
          rate: bracket.rate,
          tax: Math.round(tax * 100) / 100,
        });
      }
    }
  }

  taxBeforeRebate = Math.round(taxBeforeRebate * 100) / 100;

  // Rebates
  // Self rebate: RM400 if chargeable income ≤ RM35,000
  const selfRebate = chargeableIncome <= 35000 ? 400 : 0;
  // Spouse rebate: RM400 if joint assessment and chargeable income ≤ RM35,000
  const spouseRebate = 0; // user can input
  // Zakat is fully deductible as rebate (capped at tax amount)
  const zakatRebate = Math.min(zakat, taxBeforeRebate);
  const totalRebate = selfRebate + spouseRebate + zakatRebate;

  const taxAfterRebate = Math.max(0, taxBeforeRebate - totalRebate);
  const balancePayable = taxAfterRebate - pcbPaid;
  const effectiveRate = totalIncome > 0 ? (taxAfterRebate / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalReliefs,
    chargeableIncome,
    taxBeforeRebate,
    rebates: {
      self: selfRebate,
      spouse: spouseRebate,
      zakat: zakatRebate,
      total: totalRebate,
    },
    taxAfterRebate,
    pcbPaid,
    balancePayable,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    bracketBreakdown,
  };
}

export function formatRM(amount: number): string {
  return amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
