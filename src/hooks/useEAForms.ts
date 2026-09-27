import { useState, useCallback, useEffect } from "react";
import { getDb } from "@/lib/db";

export interface EAForm {
  id: string;
  employerName: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  year: number | null; // null for forms saved before years were tracked
}

type Row = {
  id: string;
  employer_name: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  year: number | null;
};

function rowToForm(row: Row): EAForm {
  return {
    id: row.id,
    employerName: row.employer_name,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
    year: row.year ?? null,
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
      "INSERT INTO ea_forms (id, employer_name, file_name, file_type, uploaded_at, year) VALUES (?, ?, ?, ?, ?, ?)",
      [id, form.employerName, form.fileName, form.fileType, uploadedAt, year]
    );
    setForms((prev) => [{ ...form, id, uploadedAt, year }, ...prev]);
  }, [year]);

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

  return { forms, addForm, deleteForm, employerNames, defaultEmployer };
}
