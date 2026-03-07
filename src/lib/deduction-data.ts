export type DeductionCategory =
  | "Medical"
  | "Education"
  | "Lifestyle"
  | "Sports Equipment"
  | "SSPN"
  | "Insurance"
  | "Zakat"
  | "Donations"
  | "Others";

export const CATEGORIES: DeductionCategory[] = [
  "Medical",
  "Education",
  "Lifestyle",
  "Sports Equipment",
  "SSPN",
  "Insurance",
  "Zakat",
  "Donations",
  "Others",
];

export const CATEGORY_LIMITS: Record<DeductionCategory, number> = {
  Medical: 10000,
  Education: 7000,
  Lifestyle: 2500,
  "Sports Equipment": 1000,
  SSPN: 8000,
  Insurance: 7000,
  Zakat: Infinity,
  Donations: Infinity,
  Others: Infinity,
};

export interface Deduction {
  id: string;
  category: DeductionCategory;
  amount: number;
  date: string;
  description: string;
}

export const CATEGORY_COLORS: Record<DeductionCategory, string> = {
  Medical: "hsl(var(--chart-1))",
  Education: "hsl(var(--chart-2))",
  Lifestyle: "hsl(var(--chart-3))",
  "Sports Equipment": "hsl(var(--chart-4))",
  SSPN: "hsl(var(--chart-5))",
  Insurance: "hsl(174, 40%, 50%)",
  Zakat: "hsl(42, 60%, 45%)",
  Donations: "hsl(200, 40%, 40%)",
  Others: "hsl(200, 10%, 50%)",
};
