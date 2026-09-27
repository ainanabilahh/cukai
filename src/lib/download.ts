import { isTauri } from "@/lib/files";

/** Saves a blob as a file: a save dialog in the desktop app, a normal download in the browser. */
export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  if (isTauri()) {
    // The desktop webview ignores <a download>, so ask where to save and write the file
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: filename });
    if (!path) return false;
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Prints an HTML document from a hidden iframe that cannot run scripts. */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}
