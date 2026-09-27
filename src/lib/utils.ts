import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Escapes text for safe use inside HTML markup. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
