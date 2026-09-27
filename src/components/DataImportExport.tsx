import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deduction } from "@/lib/deduction-data";
import { toast } from "sonner";
import { useRef } from "react";
import { deductionsToCsv, parseImportedDeductions } from "@/lib/import-export";
import { saveBlob } from "@/lib/download";

interface Props {
  deductions: Deduction[];
  year: number;
  onImport: (deductions: Omit<Deduction, "id">[]) => Promise<{ saved: number; duplicates: number }>;
}

export function DataImportExport({ deductions, year, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(deductions, null, 2)], { type: "application/json" });
    saveBlob(blob, `cukai-claims-${year}.json`)
      .then((ok) => ok && toast.success("Exported as JSON"))
      .catch(() => toast.error("Couldn't save the export."));
  };

  const exportCSV = () => {
    // BOM so Excel reads the file as UTF-8
    const blob = new Blob(["\uFEFF" + deductionsToCsv(deductions)], { type: "text/csv" });
    saveBlob(blob, `cukai-claims-${year}.csv`)
      .then((ok) => ok && toast.success("Exported as CSV"))
      .catch(() => toast.error("Couldn't save the export."));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let parsed: ReturnType<typeof parseImportedDeductions>;
      try {
        parsed = parseImportedDeductions(JSON.parse(reader.result as string), year);
      } catch {
        toast.error("Invalid JSON file. Please use a file exported from this app.");
        return;
      }
      const { items, skipped } = parsed;
      if (items.length === 0) {
        toast.error("No valid deductions found in that file.");
        return;
      }
      let result = { saved: 0, duplicates: 0 };
      try {
        result = await onImport(items);
      } catch (err) {
        console.error("Import failed:", err);
      }
      const { saved, duplicates } = result;
      const notes = [
        skipped > 0 && `${skipped} invalid or other-year skipped`,
        duplicates > 0 && `${duplicates} already here skipped`,
      ].filter(Boolean);
      const note = notes.length ? ` (${notes.join(", ")})` : "";
      if (saved + duplicates === items.length) toast.success(`Imported ${saved} deductions${note}`);
      else toast.error(`Imported ${saved} of ${items.length} deductions before an error${note}`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportJSON} className="gap-1.5">
        <Download className="h-3.5 w-3.5" /> JSON
      </Button>
      <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
        <Download className="h-3.5 w-3.5" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
        <Upload className="h-3.5 w-3.5" /> Import
      </Button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
