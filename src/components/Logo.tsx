import { cn } from "@/lib/utils";

/** The "Cukai." wordmark with its amber dot. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold tracking-tight", className)}>
      Cukai<span className="text-[hsl(31_70%_52%)]">.</span>
    </span>
  );
}
