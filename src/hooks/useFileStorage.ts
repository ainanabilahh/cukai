import { useState, useCallback, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory,
  readFile,
  writeFile,
  remove,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { getSetting, setSetting } from "@/lib/db";

const SETTING_KEY = "files_directory";

// Default fallback: app local data
const DEFAULT_LABEL = "App Default";

async function ensureDir(path: string) {
  const dirExists = await exists(path, { baseDir: BaseDirectory.AppLocalData });
  if (!dirExists) {
    await mkdir(path, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
}

async function ensureAbsoluteDir(path: string) {
  const dirExists = await exists(path);
  if (!dirExists) {
    await mkdir(path, { recursive: true });
  }
}

export function useFileStorage() {
  const [customDir, setCustomDir] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getSetting(SETTING_KEY).then((val) => {
      setCustomDir(val);
      setIsReady(true);
    });
  }, []);

  const pickDirectory = useCallback(async (): Promise<boolean> => {
    const selected = await open({ directory: true, multiple: false, title: "Choose Storage Folder" });
    if (!selected) return false;
    const dir = typeof selected === "string" ? selected : selected[0];
    await setSetting(SETTING_KEY, dir);
    setCustomDir(dir);
    return true;
  }, []);

  const clearDirectory = useCallback(async () => {
    const db = await import("@/lib/db");
    const dbInstance = await db.getDb();
    await dbInstance.execute("DELETE FROM settings WHERE key = ?", [SETTING_KEY]);
    setCustomDir(null);
  }, []);

  const saveFile = useCallback(async (filePath: string, data: Blob | string): Promise<boolean> => {
    try {
      let bytes: Uint8Array;
      if (typeof data === "string") {
        const res = await fetch(data);
        bytes = new Uint8Array(await res.arrayBuffer());
      } else {
        bytes = new Uint8Array(await data.arrayBuffer());
      }

      if (customDir) {
        const fullPath = `${customDir}/${filePath}`;
        const parts = fullPath.split("/");
        parts.pop();
        await ensureAbsoluteDir(parts.join("/"));
        await writeFile(fullPath, bytes);
      } else {
        const parts = `files/${filePath}`.split("/");
        parts.pop();
        await ensureDir(parts.join("/"));
        await writeFile(`files/${filePath}`, bytes, { baseDir: BaseDirectory.AppLocalData });
      }
      return true;
    } catch (err) {
      console.error("saveFile error:", err);
      return false;
    }
  }, [customDir]);

  const readFileAsUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      let bytes: Uint8Array;
      if (customDir) {
        bytes = await readFile(`${customDir}/${filePath}`);
      } else {
        bytes = await readFile(`files/${filePath}`, { baseDir: BaseDirectory.AppLocalData });
      }
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      const mime = ext === "pdf" ? "application/pdf"
        : ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
        : ext === "png" ? "image/png"
        : "application/octet-stream";
      return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }));
    } catch {
      return null;
    }
  }, [customDir]);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      if (customDir) {
        await remove(`${customDir}/${filePath}`);
      } else {
        await remove(`files/${filePath}`, { baseDir: BaseDirectory.AppLocalData });
      }
      return true;
    } catch {
      return false;
    }
  }, [customDir]);

  return {
    isSupported: true,
    isReady,
    directoryName: customDir ?? DEFAULT_LABEL,
    customDir,
    pickDirectory,
    changeDirectory: pickDirectory,
    clearDirectory,
    saveFile,
    readFile: readFileAsUrl,
    deleteFile,
  };
}
