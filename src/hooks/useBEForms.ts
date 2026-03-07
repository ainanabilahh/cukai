import { useState, useCallback } from "react";

const STORAGE_KEY = "be-forms";

export interface BEForm {
  id: string;
  year: number;
  fileName: string;
  fileType: string; // "image" or "pdf"
  uploadedAt: string;
}

function load(): BEForm[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save(forms: BEForm[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
}

export function useBEForms() {
  const [forms, setForms] = useState<BEForm[]>(load);

  const addForm = useCallback((form: Omit<BEForm, "id" | "uploadedAt">) => {
    const newForm: BEForm = { ...form, id: crypto.randomUUID(), uploadedAt: new Date().toISOString() };
    setForms((prev) => {
      const updated = [newForm, ...prev];
      save(updated);
      return updated;
    });
  }, []);

  const deleteForm = useCallback((id: string) => {
    setForms((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      save(updated);
      return updated;
    });
  }, []);

  return { forms, addForm, deleteForm };
}
