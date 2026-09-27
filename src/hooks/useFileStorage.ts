import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

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

// Every custom folder used so far, so files saved in an earlier folder stay reachable
const HISTORY_KEY = "files_directory_history";

async function loadDirHistory(): Promise<string[]> {
  const { getSetting } = await import("@/lib/db");
  try { return JSON.parse((await getSetting(HISTORY_KEY)) ?? "[]"); } catch { return []; }
}

async function addDirToHistory(dir: string) {
  const { setSetting } = await import("@/lib/db");
  const history = await loadDirHistory();
  if (!history.includes(dir)) await setSetting(HISTORY_KEY, JSON.stringify([...history, dir]));
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

// File System Access API members not yet in TypeScript's DOM types
type PermissionedHandle = FileSystemDirectoryHandle & {
  queryPermission(opts: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(opts: { mode: "readwrite" }): Promise<PermissionState>;
};
type DirectoryPickerWindow = Window & {
  showDirectoryPicker(opts: { mode: "readwrite" }): Promise<FileSystemDirectoryHandle>;
};

async function verifyBrowserPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  const h = handle as PermissionedHandle;
  if ((await h.queryPermission(opts)) === "granted") return true;
  if ((await h.requestPermission(opts)) === "granted") return true;
  return false;
}

/** File extension for an uploaded receipt or form, from its real type. */
export function fileExtension(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

/**
 * Only files the app itself created may be deleted: <name>-<uuid>.<ext>, optionally under
 * folders, with no "..". Guards against paths that came from an imported file.
 */
export function isAppFilePath(filePath: string): boolean {
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\")) return false;
  return /^([\w .-]+\/)*(receipt|ea-form|be-form)-[0-9a-f-]{36}\.(jpg|png|webp|heic|pdf)$/i.test(filePath);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFileStorage() {
  const [customDir, setCustomDir] = useState<string | null>(null);
  const [browserHandle, setBrowserHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported] = useState(() => isTauri() || "showDirectoryPicker" in window);
  // Refs so a save right after picking a folder uses the new folder, not the one from the last render
  const customDirRef = useRef<string | null>(null);
  const browserHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const pastDirsRef = useRef<string[]>([]);

  const applyCustomDir = (dir: string | null) => { customDirRef.current = dir; setCustomDir(dir); };
  const applyBrowserHandle = (h: FileSystemDirectoryHandle | null) => { browserHandleRef.current = h; setBrowserHandle(h); };

  useEffect(() => {
    if (isTauri()) {
      Promise.all([loadSavedDir(), loadDirHistory()])
        .then(async ([dir, history]) => {
          applyCustomDir(dir);
          pastDirsRef.current = history;
          // Folders chosen before the history existed still need to be remembered
          if (dir && !history.includes(dir)) {
            pastDirsRef.current = [...history, dir];
            await addDirToHistory(dir);
          }
        })
        .catch((err) => console.error("Couldn't read the saved storage folder:", err))
        // The app's own folder always works, even if the custom one couldn't be read
        .finally(() => setIsReady(true));
    } else {
      getBrowserHandle().then((handle) => {
        applyBrowserHandle(handle);
        setIsReady(!!handle);
      }).catch(() => setIsReady(false));
    }
  }, []);

  const pickDirectory = useCallback(async (): Promise<boolean> => {
    if (isTauri()) {
      try {
        const selected = await tauriOpen();
        if (!selected) return false;
        const dir = typeof selected === "string" ? selected : (selected as string[])[0];
        await saveDir(dir);
        await addDirToHistory(dir);
        if (!pastDirsRef.current.includes(dir)) pastDirsRef.current = [...pastDirsRef.current, dir];
        applyCustomDir(dir);
        setIsReady(true);
        return true;
      } catch (err) {
        console.error("Tauri folder picker error:", err);
        return false;
      }
    } else {
      if (!("showDirectoryPicker" in window)) return false;
      try {
        const handle = await (window as DirectoryPickerWindow).showDirectoryPicker({ mode: "readwrite" });
        await saveBrowserHandle(handle);
        applyBrowserHandle(handle);
        setIsReady(true);
        return true;
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error("Browser folder picker error:", err);
        return false;
      }
    }
  }, []);

  const clearDirectory = useCallback(async () => {
    if (isTauri()) {
      await clearDir();
      applyCustomDir(null);
      setIsReady(true); // falls back to the app's own folder, which is always available
    } else {
      await clearBrowserHandle();
      applyBrowserHandle(null);
      setIsReady(false);
    }
  }, []);

  /**
   * Makes sure there is somewhere to save files, asking for a folder when needed.
   * Call it first thing after a click: the browser only grants folder access during a user gesture.
   */
  const ensureReady = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      if (isTauri()) {
        if (isReady) return true;
      } else if (browserHandleRef.current) {
        if (await verifyBrowserPermission(browserHandleRef.current)) return true;
      }
      toast.info("Please choose a folder to save your files");
      return await pickDirectory();
    } catch (err) {
      // e.g. the browser refused a permission prompt outside a click
      console.error("Couldn't get access to the storage folder:", err);
      toast.error("Couldn't access your storage folder. Open Settings and choose it again.");
      return false;
    }
  }, [isSupported, isReady, pickDirectory]);

  /** Tauri: the places a stored file may live, newest first (current folder, earlier folders, app folder). */
  const tauriLocations = (filePath: string) => {
    const dirs = [customDirRef.current, ...[...pastDirsRef.current].reverse()]
      .filter((d, i, all): d is string => !!d && all.indexOf(d) === i);
    return [
      ...dirs.map((d) => ({ path: `${d}/${filePath}`, opts: undefined as object | undefined })),
      { path: `files/${filePath}`, opts: "appdata" as const },
    ];
  };

  const withBase = async (opts: object | undefined | "appdata") =>
    opts === "appdata" ? { baseDir: await getBaseDir() } : opts;

  const browserFile = async (filePath: string) => {
    const handle = browserHandleRef.current;
    if (!handle || !(await verifyBrowserPermission(handle))) return null;
    const parts = filePath.split("/");
    const fileName = parts.pop()!;
    let dir: FileSystemDirectoryHandle = handle;
    for (const part of parts) dir = await dir.getDirectoryHandle(part);
    return { dir, fileName };
  };

  const saveFile = useCallback(async (filePath: string, data: Blob | string): Promise<boolean> => {
    let bytes: Uint8Array;
    try {
      bytes = typeof data === "string"
        ? new Uint8Array(await (await fetch(data)).arrayBuffer())
        : new Uint8Array(await data.arrayBuffer());
    } catch (err) {
      console.error("Couldn't read the file to save:", err);
      return false;
    }

    if (isTauri()) {
      try {
        const dir = customDirRef.current;
        if (dir) {
          const fullPath = `${dir}/${filePath}`;
          const parent = fullPath.split("/").slice(0, -1).join("/");
          if (!(await tauriExists(parent))) await tauriMkdir(parent, { recursive: true });
          await tauriWriteFile(fullPath, bytes);
        } else {
          const base = await getBaseDir();
          const parent = `files/${filePath}`.split("/").slice(0, -1).join("/");
          if (parent && !(await tauriExists(parent, { baseDir: base })))
            await tauriMkdir(parent, { baseDir: base, recursive: true });
          await tauriWriteFile(`files/${filePath}`, bytes, { baseDir: base });
        }
        return true;
      } catch (err) { console.error("saveFile error:", err); return false; }
    } else {
      const handle = browserHandleRef.current;
      if (!handle) return false;
      try {
        if (!(await verifyBrowserPermission(handle))) return false;
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
  }, []);

  const readFileAsUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = ext === "pdf" ? "application/pdf"
      : ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
      : ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "heic" ? "image/heic"
      : "application/octet-stream";

    if (isTauri()) {
      for (const loc of tauriLocations(filePath)) {
        try {
          const bytes = await tauriReadFile(loc.path, await withBase(loc.opts));
          return URL.createObjectURL(new Blob([new Uint8Array(bytes.buffer as ArrayBuffer)], { type: mime }));
        } catch { /* try the next location */ }
      }
      return null;
    }
    try {
      const found = await browserFile(filePath);
      if (!found) return null;
      const file = await (await found.dir.getFileHandle(found.fileName)).getFile();
      return URL.createObjectURL(file);
    } catch { return null; }
  }, []);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    if (!isAppFilePath(filePath)) {
      console.warn("Refusing to delete a file the app didn't create:", filePath);
      return false;
    }
    if (isTauri()) {
      for (const loc of tauriLocations(filePath)) {
        try {
          const opts = await withBase(loc.opts);
          if (!(await tauriExists(loc.path, opts))) continue;
          await tauriRemove(loc.path, opts);
          return true;
        } catch { /* try the next location */ }
      }
      return false;
    }
    try {
      const found = await browserFile(filePath);
      if (!found) return false;
      await found.dir.removeEntry(found.fileName);
      return true;
    } catch { return false; }
  }, []);

  const hasCustomFolder = isTauri() ? customDir !== null : browserHandle !== null;

  const directoryName = isTauri()
    ? (customDir ?? "App Default")
    : (browserHandle?.name ?? null);

  return {
    isSupported,
    isReady,
    directoryName,
    customDir,
    hasCustomFolder,
    ensureReady,
    pickDirectory,
    changeDirectory: pickDirectory,
    clearDirectory,
    saveFile,
    readFile: readFileAsUrl,
    deleteFile,
  };
}
