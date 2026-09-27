/** True inside the Tauri desktop app. */
export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
};

export const MIME_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([mime, ext]) => [ext, mime]),
);
MIME_BY_EXTENSION.jpeg = "image/jpeg";

/** File extension for an uploaded receipt or form, from its real type. */
export function fileExtension(file: { type: string; name?: string }): string {
  if (EXTENSIONS[file.type]) return EXTENSIONS[file.type];
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  return fromName && MIME_BY_EXTENSION[fromName] ? fromName : "jpg";
}

/** MIME type and extension of a data: URL, or null when it isn't one. */
export function dataUrlType(url: string): { mime: string; ext: string } | null {
  const match = /^data:([\w.+-]+\/[\w.+-]+)[;,]/.exec(url);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  return { mime, ext: EXTENSIONS[mime] ?? "bin" };
}

/**
 * Only files the app itself created may be deleted: <name>-<uuid>.<ext>, optionally under
 * folders, with no "..". Guards against paths that came from an imported file.
 */
export function isAppFilePath(filePath: string): boolean {
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\")) return false;
  return /^([\w .-]+\/)*(receipt|ea-form|be-form)-[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(filePath);
}
