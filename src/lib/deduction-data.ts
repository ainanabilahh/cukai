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
  "Housing Loan Interest": 7000, // first home, SPA 2025-2027; RM5,000 if price is RM500k-750k
  "Donations": Infinity,
  "Zakat": Infinity,
};

export const CATEGORY_NOTES: Record<DeductionCategory, string> = {
  "Individual & Dependants": "Automatic relief for every individual taxpayer.",
  "Parents Medical": "Medical treatment, special needs & carer expenses for parents. Requires medical practitioner certification.",
  "Basic Supporting Equipment": "Supporting equipment for disabled individual, spouse, child or parent (e.g. wheelchair, hearing aids, prosthetics).",
  "Disabled Individual": "Additional relief if you are a registered disabled person (OKU card holder).",
  "Education Fees (Self)": "Course fees for Masters/Doctorate, or upskilling courses in recognized institutions (law, accounting, technical, vocational, etc.).",
  "Medical Expenses": "Serious diseases, fertility treatment, vaccination (up to RM1,000), dental (up to RM1,500), mental health examination & consultation.",
  "Learning Disability": "Assessment & early intervention/rehabilitation for learning disabilities (e.g. autism, ADHD, dyslexia) for children aged 18 and below.",
  "Lifestyle": "Books, magazines & journals; computer/tablet/smartphone; sports equipment & gym membership; internet subscription; EV charging costs (personal use).",
  "Additional Lifestyle": "Sports equipment, rental/entry fees for sports facilities, registration for sports competitions.",
  "Breastfeeding Equipment": "Purchase of breastfeeding equipment (pump, ice pack, storage bags, etc.). Claimable every 2 years, for mothers with child under 2.",
  "Childcare Fees": "Fees paid to registered childcare centre or kindergarten for children aged 6 and below.",
  "SSPN": "Net savings in Skim Simpanan Pendidikan Nasional (National Education Savings Scheme) for child's education.",
  "Spouse / Alimony": "Relief for spouse with no income, or alimony payments to former wife.",
  "Disabled Spouse": "Additional relief if spouse is a registered disabled person (OKU card holder).",
  "Child (Under 18)": "RM2,000 per unmarried child under 18 years old.",
  "Child (18+ Studying)": "RM8,000 per unmarried child 18+ receiving full-time education (diploma/degree level and above in Malaysia or equivalent overseas).",
  "Child (Disabled)": "RM6,000 per disabled child. Additional RM8,000 if pursuing higher education.",
  "Life Insurance & EPF": "Life insurance premiums & EPF/KWSP statutory contributions (combined limit).",
  "EPF (Voluntary/Approved)": "Voluntary EPF contributions or contributions to approved schemes (PRS, etc.).",
  "Private Retirement Scheme": "Contributions to Private Retirement Scheme (PRS) or deferred annuity.",
  "Education & Medical Insurance": "Premiums for education insurance or medical/health insurance (including critical illness).",
  "SOCSO / EIS": "SOCSO (PERKESO) and Employment Insurance System (SIP/EIS) contributions.",
  "EV Charging / Green Tech": "Purchase, installation, rental or hire-purchase of EV charging equipment. Also includes green technology assets.",
  "Housing Loan Interest": "Interest on housing loan for first residential property (conditions apply based on SPA date & property value).",
  "Donations": "Approved donations & gifts of money to the Government, approved institutions, sports activities, or approved projects.",
  "Zakat": "Zakat fitrah and zakat on income paid to approved Islamic authorities. Rebate (deducted from tax, not income).",
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

export type DeductionFrequency = "yearly" | "monthly";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface Deduction {
  id: string;
  category: DeductionCategory;
  amount: number;
  date: string;
  description: string;
  receiptImages?: string[];
  frequency: DeductionFrequency;
  month?: string; // only for monthly
}
