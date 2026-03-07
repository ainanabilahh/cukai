import { useState, useEffect, useCallback } from "react";

const DB_NAME = "tax-file-storage";
const STORE_NAME = "handles";
const DIR_HANDLE_KEY = "directory-handle";

// IndexedDB helpers for persisting directory handle
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DIR_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, DIR_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearHandle(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(DIR_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await (handle as any).queryPermission(opts)) === "granted") return true;
  if ((await (handle as any).requestPermission(opts)) === "granted") return true;
  return false;
}

export function useFileStorage() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported] = useState(() => "showDirectoryPicker" in window);

  // Try to restore saved handle on mount
  useEffect(() => {
    if (!isSupported) return;
    getStoredHandle().then(async (handle) => {
      if (handle) {
        try {
          // Just check if we have it - don't request permission yet
          setDirHandle(handle);
          setDirectoryName(handle.name);
          setIsReady(true);
        } catch {
          setIsReady(false);
        }
      }
    });
  }, [isSupported]);

  const pickDirectory = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      await storeHandle(handle);
      setDirHandle(handle);
      setDirectoryName(handle.name);
      setIsReady(true);
      return true;
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("Directory picker error:", err);
      return false;
    }
  }, [isSupported]);

  const ensurePermission = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!dirHandle) return null;
    const granted = await verifyPermission(dirHandle);
    if (!granted) {
      // Permission denied, user needs to re-pick
      setIsReady(false);
      return null;
    }
    return dirHandle;
  }, [dirHandle]);

  // Navigate to a subdirectory, creating folders as needed
  const getSubdirectory = useCallback(async (rootHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> => {
    const parts = path.split("/").filter(Boolean);
    let current = rootHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
    return current;
  }, []);

  const saveFile = useCallback(async (filePath: string, data: Blob | string): Promise<boolean> => {
    const handle = await ensurePermission();
    if (!handle) return false;
    try {
      // Support paths like "2025/receipts/umobile/receipt-xxx.jpg"
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      let targetDir = handle;
      if (parts.length > 0) {
        targetDir = await getSubdirectory(handle, parts.join("/"));
      }
      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      if (typeof data === "string") {
        const response = await fetch(data);
        const blob = await response.blob();
        await writable.write(blob);
      } else {
        await writable.write(data);
      }
      await writable.close();
      return true;
    } catch (err) {
      console.error("Save file error:", err);
      return false;
    }
  }, [ensurePermission, getSubdirectory]);

  const readFile = useCallback(async (filePath: string): Promise<string | null> => {
    const handle = await ensurePermission();
    if (!handle) return null;
    try {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      let targetDir = handle;
      if (parts.length > 0) {
        targetDir = await getSubdirectory(handle, parts.join("/"));
      }
      const fileHandle = await targetDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }, [ensurePermission, getSubdirectory]);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    const handle = await ensurePermission();
    if (!handle) return false;
    try {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      let targetDir = handle;
      if (parts.length > 0) {
        targetDir = await getSubdirectory(handle, parts.join("/"));
      }
      await targetDir.removeEntry(fileName);
      return true;
    } catch {
      return false;
    }
  }, [ensurePermission, getSubdirectory]);

  const changeDirectory = useCallback(async (): Promise<boolean> => {
    return pickDirectory();
  }, [pickDirectory]);

  const clearDirectory = useCallback(async () => {
    await clearHandle();
    setDirHandle(null);
    setDirectoryName(null);
    setIsReady(false);
  }, []);

  return {
    isSupported,
    isReady,
    directoryName,
    pickDirectory,
    changeDirectory,
    clearDirectory,
    saveFile,
    readFile,
    deleteFile,
  };
}
