export type DeductionCategory =
  | "Perubatan"
  | "Pendidikan"
  | "Gaya Hidup"
  | "Peralatan Sukan"
  | "SSPN"
  | "Insurans"
  | "Zakat"
  | "Derma"
  | "Lain-lain";

export const CATEGORIES: DeductionCategory[] = [
  "Perubatan",
  "Pendidikan",
  "Gaya Hidup",
  "Peralatan Sukan",
  "SSPN",
  "Insurans",
  "Zakat",
  "Derma",
  "Lain-lain",
];

export const CATEGORY_LIMITS: Record<DeductionCategory, number> = {
  Perubatan: 10000,
  Pendidikan: 7000,
  "Gaya Hidup": 2500,
  "Peralatan Sukan": 1000,
  SSPN: 8000,
  Insurans: 7000,
  Zakat: Infinity,
  Derma: Infinity,
  "Lain-lain": Infinity,
};

export interface Deduction {
  id: string;
  category: DeductionCategory;
  amount: number;
  date: string;
  description: string;
}

export const CATEGORY_COLORS: Record<DeductionCategory, string> = {
  Perubatan: "hsl(var(--chart-1))",
  Pendidikan: "hsl(var(--chart-2))",
  "Gaya Hidup": "hsl(var(--chart-3))",
  "Peralatan Sukan": "hsl(var(--chart-4))",
  SSPN: "hsl(var(--chart-5))",
  Insurans: "hsl(174, 40%, 50%)",
  Zakat: "hsl(42, 60%, 45%)",
  Derma: "hsl(200, 40%, 40%)",
  "Lain-lain": "hsl(200, 10%, 50%)",
};
