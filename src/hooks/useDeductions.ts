import { useState, useCallback, useMemo, useEffect } from "react";
import { Deduction, DeductionCategory } from "@/lib/deduction-data";
import { getDb } from "@/lib/db";

type Row = {
  id: string;
  year: number;
  category: string;
  amount: number;
  date: string;
  description: string;
  frequency: string;
  month: string | null;
  receipt_images: string | null;
};

function rowToDeduction(row: Row): Deduction {
  return {
    id: row.id,
    category: row.category as DeductionCategory,
    amount: row.amount,
    date: row.date,
    description: row.description,
    frequency: row.frequency as "yearly" | "monthly",
    month: row.month ?? undefined,
    receiptImages: row.receipt_images ? JSON.parse(row.receipt_images) : undefined,
  };
}

async function fetchDeductions(year: number): Promise<Deduction[]> {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    "SELECT * FROM deductions WHERE year = ? ORDER BY date DESC",
    [year]
  );
  return rows.map(rowToDeduction);
}

export function useDeductions(year: number) {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<DeductionCategory | "all">("all");

  useEffect(() => {
    // Ignore a response for a year the user has already switched away from
    let current = true;
    fetchDeductions(year)
      .then((rows) => { if (current) setDeductions(rows); })
      .catch((err) => console.error("Failed to load deductions:", err));
    return () => { current = false; };
  }, [year]);

  const addDeduction = useCallback(async (deduction: Omit<Deduction, "id">) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO deductions (id, year, category, amount, date, description, frequency, month, receipt_images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        year,
        deduction.category,
        deduction.amount,
        deduction.date,
        deduction.description,
        deduction.frequency,
        deduction.month ?? null,
        deduction.receiptImages ? JSON.stringify(deduction.receiptImages) : null,
      ]
    );
    const newDeduction: Deduction = { ...deduction, id };
    setDeductions((prev) => [newDeduction, ...prev]);
  }, [year]);

  /** Inserts the items and returns how many were saved; stops at the first failure without throwing. */
  const importDeductions = useCallback(async (items: Omit<Deduction, "id">[]): Promise<number> => {
    const db = await getDb();
    let saved = 0;
    try {
      for (const item of items) {
        const id = crypto.randomUUID();
        await db.execute(
          `INSERT INTO deductions (id, year, category, amount, date, description, frequency, month, receipt_images)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            year,
            item.category,
            item.amount,
            item.date,
            item.description,
            item.frequency,
            item.month ?? null,
            item.receiptImages ? JSON.stringify(item.receiptImages) : null,
          ]
        );
        saved++;
      }
    } catch (err) {
      console.error("Import stopped after", saved, "rows:", err);
    }
    setDeductions(await fetchDeductions(year));
    return saved;
  }, [year]);

  const checkDuplicate = useCallback(
    (deduction: { category: string; amount: number; date: string; description: string }) => {
      return deductions.some(
        (d) =>
          d.category === deduction.category &&
          d.amount === deduction.amount &&
          d.date === deduction.date &&
          d.description.toLowerCase() === deduction.description.toLowerCase()
      );
    },
    [deductions]
  );

  const updateDeduction = useCallback(async (id: string, updates: Partial<Deduction>) => {
    const db = await getDb();
    const existing = deductions.find((d) => d.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    await db.execute(
      `UPDATE deductions SET category=?, amount=?, date=?, description=?, frequency=?, month=?, receipt_images=?
       WHERE id=?`,
      [
        merged.category,
        merged.amount,
        merged.date,
        merged.description,
        merged.frequency,
        merged.month ?? null,
        merged.receiptImages ? JSON.stringify(merged.receiptImages) : null,
        id,
      ]
    );
    setDeductions((prev) => prev.map((d) => (d.id === id ? merged : d)));
  }, [deductions]);

  const deleteDeduction = useCallback(async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM deductions WHERE id=?", [id]);
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  }, []);

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
  };
}
