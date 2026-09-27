import { useState, useCallback, useEffect, useMemo } from "react";
import { getDb } from "@/lib/db";

export interface EAForm {
  id: string;
  employerName: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  year: number | null; // null for forms saved before years were tracked
  totalIncome: number | null; // gross employment income on the form (RM)
  pcb: number | null; // tax deducted by the employer (PCB/MTD) on the form (RM)
}

type Row = {
  id: string;
  employer_name: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  year: number | null;
  total_income: number | null;
  pcb: number | null;
};

function rowToForm(row: Row): EAForm {
  return {
    id: row.id,
    employerName: row.employer_name,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
    year: row.year ?? null,
    totalIncome: row.total_income ?? null,
    pcb: row.pcb ?? null,
  };
}

async function fetchForms(year: number): Promise<EAForm[]> {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    "SELECT * FROM ea_forms WHERE year = ? OR year IS NULL ORDER BY uploaded_at DESC",
    [year]
  );
  return rows.map(rowToForm);
}

/** Employer names used before, most recently used first. */
async function fetchEmployerNames(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ employer_name: string }[]>(
    `SELECT employer_name FROM ea_forms
     GROUP BY employer_name COLLATE NOCASE
     ORDER BY MAX(uploaded_at) DESC`
  );
  return rows.map((r) => r.employer_name);
}

/** Employer on the latest EA form from an earlier year, falling back to the most recent one. */
async function fetchDefaultEmployer(year: number): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ employer_name: string }[]>(
    `SELECT employer_name FROM ea_forms
     ORDER BY (year IS NOT NULL AND year < ?) DESC, year DESC, uploaded_at DESC
     LIMIT 1`,
    [year]
  );
  return rows[0]?.employer_name ?? null;
}

export function useEAForms(year: number) {
  const [forms, setForms] = useState<EAForm[]>([]);

  useEffect(() => {
    let current = true;
    fetchForms(year)
      .then((rows) => { if (current) setForms(rows); })
      .catch((err) => console.error("Failed to load EA forms:", err));
    return () => { current = false; };
  }, [year]);

  const addForm = useCallback(async (form: Omit<EAForm, "id" | "uploadedAt" | "year">) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();
    await db.execute(
      `INSERT INTO ea_forms (id, employer_name, file_name, file_type, uploaded_at, year, total_income, pcb)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, form.employerName, form.fileName, form.fileType, uploadedAt, year, form.totalIncome, form.pcb]
    );
    setForms((prev) => [{ ...form, id, uploadedAt, year }, ...prev]);
  }, [year]);

  const updateAmounts = useCallback(async (id: string, totalIncome: number | null, pcb: number | null) => {
    const db = await getDb();
    await db.execute("UPDATE ea_forms SET total_income = ?, pcb = ? WHERE id = ?", [totalIncome, pcb, id]);
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, totalIncome, pcb } : f)));
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM ea_forms WHERE id=?", [id]);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const [employerNames, setEmployerNames] = useState<string[]>([]);
  const [defaultEmployer, setDefaultEmployer] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([fetchEmployerNames(), fetchDefaultEmployer(year)])
      .then(([names, fallback]) => { setEmployerNames(names); setDefaultEmployer(fallback); })
      .catch((err) => console.error("Failed to load employer names:", err));
  }, [forms, year]);

  // Year totals from this year's forms that have amounts (older forms without a year are left out)
  const totals = useMemo(() => {
    const own = forms.filter((f) => f.year === year);
    const withIncome = own.filter((f) => f.totalIncome !== null);
    const withPcb = own.filter((f) => f.pcb !== null);
    return {
      income: withIncome.length ? withIncome.reduce((s, f) => s + (f.totalIncome ?? 0), 0) : null,
      pcb: withPcb.length ? withPcb.reduce((s, f) => s + (f.pcb ?? 0), 0) : null,
    };
  }, [forms, year]);

  return { forms, addForm, updateAmounts, deleteForm, employerNames, defaultEmployer, totals };
}

export type EAFormsState = ReturnType<typeof useEAForms>;
