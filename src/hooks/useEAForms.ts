import { useState, useCallback } from "react";

const STORAGE_KEY = "ea-forms";

export interface EAForm {
  id: string;
  employerName: string;
  file: string; // base64 data URL
  fileType: string; // "image" or "pdf"
  uploadedAt: string;
}

function load(): EAForm[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save(forms: EAForm[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
}

export function useEAForms() {
  const [forms, setForms] = useState<EAForm[]>(load);

  const addForm = useCallback((form: Omit<EAForm, "id" | "uploadedAt">) => {
    const newForm: EAForm = { ...form, id: crypto.randomUUID(), uploadedAt: new Date().toISOString() };
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
