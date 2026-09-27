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
  // Off-screen but full size: WebKit prints a zero-size frame as a blank page
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "800px", height: "1100px", border: "0" });
  frame.srcdoc = html;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    win.addEventListener("afterprint", () => frame.remove(), { once: true });
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}
