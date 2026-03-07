import { useState, useCallback, useEffect } from "react";
import { getDb } from "@/lib/db";

export interface EAForm {
  id: string;
  employerName: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

type Row = {
  id: string;
  employer_name: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
};

function rowToForm(row: Row): EAForm {
  return {
    id: row.id,
    employerName: row.employer_name,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
  };
}

async function fetchForms(): Promise<EAForm[]> {
  const db = await getDb();
  const rows = await db.select<Row[]>(
    "SELECT * FROM ea_forms ORDER BY uploaded_at DESC"
  );
  return rows.map(rowToForm);
}

export function useEAForms() {
  const [forms, setForms] = useState<EAForm[]>([]);

  useEffect(() => {
    fetchForms().then(setForms);
  }, []);

  const addForm = useCallback(async (form: Omit<EAForm, "id" | "uploadedAt">) => {
    const db = await getDb();
    const id = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();
    await db.execute(
      "INSERT INTO ea_forms (id, employer_name, file_name, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?)",
      [id, form.employerName, form.fileName, form.fileType, uploadedAt]
    );
    setForms((prev) => [{ ...form, id, uploadedAt }, ...prev]);
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM ea_forms WHERE id=?", [id]);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { forms, addForm, deleteForm };
}
