import { createContext, useContext } from "react";
import { useFileStorage } from "@/hooks/useFileStorage";

type FileStorageContextType = ReturnType<typeof useFileStorage>;

const FileStorageContext = createContext<FileStorageContextType | null>(null);

export function FileStorageProvider({ children }: { children: React.ReactNode }) {
  const storage = useFileStorage();
  return (
    <FileStorageContext.Provider value={storage}>
      {children}
    </FileStorageContext.Provider>
  );
}

export function useFileStorageContext() {
  const ctx = useContext(FileStorageContext);
  if (!ctx) throw new Error("useFileStorageContext must be used within FileStorageProvider");
  return ctx;
}
