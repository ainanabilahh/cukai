import { useState, useCallback, useEffect } from "react";

const isTauri = () => "__TAURI_INTERNALS__" in window;

// ── Tauri imports (loaded lazily to avoid errors in browser) ──────────────────
async function tauriOpen() {
  const { open } = await import("@tauri-apps/plugin-dialog");
  // recursive: the picked folder and everything under it becomes readable and writable
  return open({ directory: true, multiple: false, recursive: true, title: "Choose Storage Folder" });
}

async function tauriReadFile(path: string, opts?: object): Promise<Uint8Array> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return readFile(path, opts);
}

async function tauriWriteFile(path: string, data: Uint8Array, opts?: object) {
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  return writeFile(path, data, opts);
}

async function tauriRemove(path: string, opts?: object) {
  const { remove } = await import("@tauri-apps/plugin-fs");
  return remove(path, opts);
}

async function tauriMkdir(path: string, opts?: object) {
  const { mkdir } = await import("@tauri-apps/plugin-fs");
  return mkdir(path, opts);
}

async function tauriExists(path: string, opts?: object): Promise<boolean> {
  const { exists } = await import("@tauri-apps/plugin-fs");
  return exists(path, opts);
}

async function getBaseDir() {
  const { BaseDirectory } = await import("@tauri-apps/plugin-fs");
  return BaseDirectory.AppLocalData;
}

// ── DB helpers (Tauri only) ───────────────────────────────────────────────────
const SETTING_KEY = "files_directory";

async function loadSavedDir(): Promise<string | null> {
  const { getSetting } = await import("@/lib/db");
  return getSetting(SETTING_KEY);
}

async function saveDir(dir: string) {
  const { setSetting } = await import("@/lib/db");
  return setSetting(SETTING_KEY, dir);
}

async function clearDir() {
  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  await db.execute("DELETE FROM settings WHERE key = ?", [SETTING_KEY]);
}

// ── IndexedDB helpers for browser fallback ────────────────────────────────────
const IDB_NAME = "tax-file-storage";
const IDB_STORE = "handles";
const IDB_KEY = "directory-handle";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBrowserHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function saveBrowserHandle(handle: FileSystemDirectoryHandle) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearBrowserHandle() {
  const db = await openIDB();
  return new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function verifyBrowserPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await (handle as any).queryPermission(opts)) === "granted") return true;
  if ((await (handle as any).requestPermission(opts)) === "granted") return true;
  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFileStorage() {
  const [customDir, setCustomDir] = useState<string | null>(null);
  const [browserHandle, setBrowserHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported] = useState(() => isTauri() || "showDirectoryPicker" in window);

  useEffect(() => {
    if (isTauri()) {
      loadSavedDir().then((val) => { setCustomDir(val); setIsReady(true); });
    } else {
      getBrowserHandle().then((handle) => {
        if (handle) { setBrowserHandle(handle); setIsReady(true); }
        else { setIsReady(false); }
      });
    }
  }, []);

  const pickDirectory = useCallback(async (): Promise<boolean> => {
    if (isTauri()) {
      try {
        const selected = await tauriOpen();
        if (!selected) return false;
        const dir = typeof selected === "string" ? selected : (selected as string[])[0];
        await saveDir(dir);
        setCustomDir(dir);
        setIsReady(true);
        return true;
      } catch (err) {
        console.error("Tauri folder picker error:", err);
        return false;
      }
    } else {
      if (!("showDirectoryPicker" in window)) return false;
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
        await saveBrowserHandle(handle);
        setBrowserHandle(handle);
        setIsReady(true);
        return true;
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Browser folder picker error:", err);
        return false;
      }
    }
  }, []);

  const clearDirectory = useCallback(async () => {
    if (isTauri()) {
      await clearDir();
      setCustomDir(null);
    } else {
      await clearBrowserHandle();
      setBrowserHandle(null);
    }
    setIsReady(false);
  }, []);

  const saveFile = useCallback(async (filePath: string, data: Blob | string): Promise<boolean> => {
    let bytes: Uint8Array;
    if (typeof data === "string") {
      const res = await fetch(data);
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      bytes = new Uint8Array(await data.arrayBuffer());
    }

    if (isTauri()) {
      try {
        if (customDir) {
          const fullPath = `${customDir}/${filePath}`;
          const parts = fullPath.split("/"); parts.pop();
          const dirPath = parts.join("/");
          if (!(await tauriExists(dirPath))) await tauriMkdir(dirPath, { recursive: true });
          await tauriWriteFile(fullPath, bytes);
        } else {
          const base = await getBaseDir();
          const dirPath = `files/${filePath}`.split("/").slice(0, -1).join("/");
          if (dirPath && !(await tauriExists(dirPath, { baseDir: base })))
            await tauriMkdir(dirPath, { baseDir: base, recursive: true });
          await tauriWriteFile(`files/${filePath}`, bytes, { baseDir: base });
        }
        return true;
      } catch (err) { console.error("saveFile error:", err); return false; }
    } else {
      if (!browserHandle) return false;
      try {
        const handle = await verifyBrowserPermission(browserHandle) ? browserHandle : null;
        if (!handle) return false;
        const parts = filePath.split("/");
        const fileName = parts.pop()!;
        let dir: FileSystemDirectoryHandle = handle;
        for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
        const fh = await dir.getFileHandle(fileName, { create: true });
        const writable = await fh.createWritable();
        await writable.write(new Blob([bytes.buffer as ArrayBuffer]));
        await writable.close();
        return true;
      } catch (err) { console.error("saveFile browser error:", err); return false; }
    }
  }, [customDir, browserHandle]);

  const readFileAsUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = ext === "pdf" ? "application/pdf"
      : ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
      : ext === "png" ? "image/png"
      : "application/octet-stream";

    if (isTauri()) {
      try {
        let bytes: Uint8Array;
        if (customDir) {
          bytes = await tauriReadFile(`${customDir}/${filePath}`);
        } else {
          const base = await getBaseDir();
          bytes = await tauriReadFile(`files/${filePath}`, { baseDir: base });
        }
        return URL.createObjectURL(new Blob([new Uint8Array(bytes.buffer as ArrayBuffer)], { type: mime }));
      } catch { return null; }
    } else {
      if (!browserHandle) return null;
      try {
        const parts = filePath.split("/");
        const fileName = parts.pop()!;
        let dir: FileSystemDirectoryHandle = browserHandle;
        for (const part of parts) dir = await dir.getDirectoryHandle(part);
        const fh = await dir.getFileHandle(fileName);
        const file = await fh.getFile();
        return URL.createObjectURL(file);
      } catch { return null; }
    }
  }, [customDir, browserHandle]);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    if (isTauri()) {
      try {
        if (customDir) {
          await tauriRemove(`${customDir}/${filePath}`);
        } else {
          const base = await getBaseDir();
          await tauriRemove(`files/${filePath}`, { baseDir: base });
        }
        return true;
      } catch { return false; }
    } else {
      if (!browserHandle) return false;
      try {
        const parts = filePath.split("/");
        const fileName = parts.pop()!;
        let dir: FileSystemDirectoryHandle = browserHandle;
        for (const part of parts) dir = await dir.getDirectoryHandle(part);
        await dir.removeEntry(fileName);
        return true;
      } catch { return false; }
    }
  }, [customDir, browserHandle]);

  const directoryName = isTauri()
    ? (customDir ?? "App Default")
    : (browserHandle?.name ?? null);

  return {
    isSupported,
    isReady,
    directoryName,
    customDir,
    pickDirectory,
    changeDirectory: pickDirectory,
    clearDirectory,
    saveFile,
    readFile: readFileAsUrl,
    deleteFile,
  };
}
