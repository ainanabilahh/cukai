import { useState, useCallback } from "react";

const STORAGE_KEY = "ea-forms";

export interface EAForm {
  id: string;
  employerName: string;
  fileName: string; // filename in storage folder
  fileType: string; // "image" or "pdf"
  uploadedAt: string;
  /** @deprecated Legacy field - old base64 data URL */
  file?: string;
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
  // Strip any legacy base64 data before saving to keep localStorage lean
  const clean = forms.map(({ file, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function useEAForms() {
  const [forms, setForms] = useState<EAForm[]>(load);

  const addForm = useCallback((form: Omit<EAForm, "id" | "uploadedAt" | "file">) => {
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
