import { useState, useCallback, useMemo } from "react";
import { Deduction, DeductionCategory, CATEGORY_LIMITS } from "@/lib/deduction-data";

function storageKey(year: number) {
  return `tax-deductions-${year}`;
}

function loadDeductions(year: number): Deduction[] {
  try {
    // Migrate old data from legacy key on first load
    const legacyKey = "tax-deductions";
    const legacyData = localStorage.getItem(legacyKey);
    if (legacyData) {
      const currentYearKey = storageKey(year);
      if (!localStorage.getItem(currentYearKey)) {
        localStorage.setItem(currentYearKey, legacyData);
      }
      localStorage.removeItem(legacyKey);
    }

    const data = localStorage.getItem(storageKey(year));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDeductions(year: number, deductions: Deduction[]) {
  localStorage.setItem(storageKey(year), JSON.stringify(deductions));
}

export function useDeductions(year: number) {
  const [deductions, setDeductions] = useState<Deduction[]>(() => loadDeductions(year));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<DeductionCategory | "all">("all");

  // Reload when year changes
  const switchYear = useCallback((newYear: number) => {
    setDeductions(loadDeductions(newYear));
  }, []);

  const addDeduction = useCallback((deduction: Omit<Deduction, "id">) => {
    const newDeduction: Deduction = {
      ...deduction,
      id: crypto.randomUUID(),
    };
    setDeductions((prev) => {
      const updated = [newDeduction, ...prev];
      saveDeductions(year, updated);
      return updated;
    });
  }, [year]);

  const importDeductions = useCallback((items: Omit<Deduction, "id">[]) => {
    setDeductions((prev) => {
      const newOnes = items.map((item) => ({ ...item, id: crypto.randomUUID() }));
      const updated = [...newOnes, ...prev];
      saveDeductions(year, updated);
      return updated;
    });
  }, [year]);

  const checkDuplicate = useCallback((deduction: { category: string; amount: number; date: string; description: string }) => {
    return deductions.some(
      (d) =>
        d.category === deduction.category &&
        d.amount === deduction.amount &&
        d.date === deduction.date &&
        d.description.toLowerCase() === deduction.description.toLowerCase()
    );
  }, [deductions]);

  const updateDeduction = useCallback((id: string, updates: Partial<Deduction>) => {
    setDeductions((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
      saveDeductions(year, updated);
      return updated;
    });
  }, [year]);

  const deleteDeduction = useCallback((id: string) => {
    setDeductions((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveDeductions(year, updated);
      return updated;
    });
  }, [year]);

  const filteredDeductions = useMemo(() => {
    let result = deductions;
    if (filterCategory !== "all") {
      result = result.filter((d) => d.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.amount.toString().includes(q)
      );
    }
    return result;
  }, [deductions, searchQuery, filterCategory]);

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

  return {
    deductions,
    filteredDeductions,
    addDeduction,
    importDeductions,
    checkDuplicate,
    updateDeduction,
    deleteDeduction,
    total,
    totalByCategory,
    categoryData,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    switchYear,
  };
}
