export type DeductionCategory =
  | "Individual & Dependants"
  | "Parents Medical"
  | "Basic Supporting Equipment"
  | "Disabled Individual"
  | "Education Fees (Self)"
  | "Medical Expenses"
  | "Learning Disability"
  | "Lifestyle"
  | "Additional Lifestyle"
  | "Breastfeeding Equipment"
  | "Childcare Fees"
  | "SSPN"
  | "Spouse / Alimony"
  | "Disabled Spouse"
  | "Child (Under 18)"
  | "Child (18+ Studying)"
  | "Child (Disabled)"
  | "Life Insurance & EPF"
  | "EPF (Voluntary/Approved)"
  | "Private Retirement Scheme"
  | "Education & Medical Insurance"
  | "SOCSO / EIS"
  | "EV Charging / Green Tech"
  | "Housing Loan Interest"
  | "Donations"
  | "Zakat";

export const CATEGORIES: DeductionCategory[] = [
  "Individual & Dependants",
  "Parents Medical",
  "Basic Supporting Equipment",
  "Disabled Individual",
  "Education Fees (Self)",
  "Medical Expenses",
  "Learning Disability",
  "Lifestyle",
  "Additional Lifestyle",
  "Breastfeeding Equipment",
  "Childcare Fees",
  "SSPN",
  "Spouse / Alimony",
  "Disabled Spouse",
  "Child (Under 18)",
  "Child (18+ Studying)",
  "Child (Disabled)",
  "Life Insurance & EPF",
  "EPF (Voluntary/Approved)",
  "Private Retirement Scheme",
  "Education & Medical Insurance",
  "SOCSO / EIS",
  "EV Charging / Green Tech",
  "Housing Loan Interest",
  "Donations",
  "Zakat",
];

export const CATEGORY_LIMITS: Record<DeductionCategory, number> = {
  "Individual & Dependants": 9000,
  "Parents Medical": 8000,
  "Basic Supporting Equipment": 6000,
  "Disabled Individual": 7000,
  "Education Fees (Self)": 7000,
  "Medical Expenses": 10000,
  "Learning Disability": 6000,
  "Lifestyle": 2500,
  "Additional Lifestyle": 1000,
  "Breastfeeding Equipment": 1000,
  "Childcare Fees": 3000,
  "SSPN": 8000,
  "Spouse / Alimony": 4000,
  "Disabled Spouse": 6000,
  "Child (Under 18)": Infinity,
  "Child (18+ Studying)": Infinity,
  "Child (Disabled)": Infinity,
  "Life Insurance & EPF": 3000,
  "EPF (Voluntary/Approved)": 4000,
  "Private Retirement Scheme": 3000,
  "Education & Medical Insurance": 4000,
  "SOCSO / EIS": 350,
  "EV Charging / Green Tech": 2500,
  "Housing Loan Interest": Infinity,
  "Donations": Infinity,
  "Zakat": Infinity,
};

export const CATEGORY_GROUPS: Record<string, DeductionCategory[]> = {
  "Personal Relief": [
    "Individual & Dependants",
    "Disabled Individual",
    "Education Fees (Self)",
    "Lifestyle",
    "Additional Lifestyle",
  ],
  "Family": [
    "Spouse / Alimony",
    "Disabled Spouse",
    "Child (Under 18)",
    "Child (18+ Studying)",
    "Child (Disabled)",
    "Childcare Fees",
    "Breastfeeding Equipment",
  ],
  "Medical": [
    "Parents Medical",
    "Medical Expenses",
    "Basic Supporting Equipment",
    "Learning Disability",
  ],
  "Insurance & Savings": [
    "Life Insurance & EPF",
    "EPF (Voluntary/Approved)",
    "Private Retirement Scheme",
    "Education & Medical Insurance",
    "SOCSO / EIS",
    "SSPN",
  ],
  "Others": [
    "EV Charging / Green Tech",
    "Housing Loan Interest",
    "Donations",
    "Zakat",
  ],
};

export interface Deduction {
  id: string;
  category: DeductionCategory;
  amount: number;
  date: string;
  description: string;
}
