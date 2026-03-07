import { useState, useCallback } from "react";
import { Deduction, DeductionCategory, CATEGORY_LIMITS } from "@/lib/deduction-data";

const STORAGE_KEY = "tax-deductions";

function loadDeductions(): Deduction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDeductions(deductions: Deduction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deductions));
}

export function useDeductions() {
  const [deductions, setDeductions] = useState<Deduction[]>(loadDeductions);

  const addDeduction = useCallback((deduction: Omit<Deduction, "id">) => {
    const newDeduction: Deduction = {
      ...deduction,
      id: crypto.randomUUID(),
    };
    setDeductions((prev) => {
      const updated = [newDeduction, ...prev];
      saveDeductions(updated);
      return updated;
    });
  }, []);

  const deleteDeduction = useCallback((id: string) => {
    setDeductions((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveDeductions(updated);
      return updated;
    });
  }, []);

  const totalByCategory = deductions.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + d.amount;
    return acc;
  }, {} as Record<string, number>);

  const total = deductions.reduce((sum, d) => sum + d.amount, 0);

  const categoryData = Object.entries(totalByCategory).map(([name, value]) => ({
    name,
    value,
    limit: CATEGORY_LIMITS[name as DeductionCategory],
  }));

  return { deductions, addDeduction, deleteDeduction, total, totalByCategory, categoryData };
}
