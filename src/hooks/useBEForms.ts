import { useState, useCallback, useEffect } from "react";
import { getDb } from "@/lib/db";

export interface BEForm {
  id: string;
  year: number;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

type Row = {
  id: string;
  year: number;
  file_name: string;
  file_type: string;
  uploaded_at: string;
};

function rowToForm(row: Row): BEForm {
  return {
    id: row.id,
    year: row.year,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
  };
}

async function fetchForms(): Promise<BEForm[]> {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    "SELECT * FROM be_forms ORDER BY uploaded_at DESC"
  );
  return rows.map(rowToForm);
}

export function useBEForms() {
  const [forms, setForms] = useState<BEForm[]>([]);

  useEffect(() => {
    fetchForms().then(setForms);
  }, []);

  const addForm = useCallback(async (form: Omit<BEForm, "id" | "uploadedAt">) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();
    await db.execute(
      "INSERT INTO be_forms (id, year, file_name, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?)",
      [id, form.year, form.fileName, form.fileType, uploadedAt]
    );
    setForms((prev) => [{ ...form, id, uploadedAt }, ...prev]);
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM be_forms WHERE id=?", [id]);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { forms, addForm, deleteForm };
}
