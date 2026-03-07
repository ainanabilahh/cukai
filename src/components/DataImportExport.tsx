import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Deduction } from "@/lib/deduction-data";
import { toast } from "sonner";
import { useRef } from "react";

interface Props {
  deductions: Deduction[];
  year: number;
  onImport: (deductions: Omit<Deduction, "id">[]) => void;
}

export function DataImportExport({ deductions, year, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(deductions, null, 2)], { type: "application/json" });
    download(blob, `tax-deductions-${year}.json`);
    toast.success("Exported as JSON");
  };

  const exportCSV = () => {
    const headers = ["Category", "Amount", "Date", "Description", "Frequency", "Month"];
    const rows = deductions.map((d) => [
      `"${d.category}"`,
      d.amount,
      d.date,
      `"${d.description}"`,
      d.frequency,
      d.month || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    download(blob, `tax-deductions-${year}.csv`);
    toast.success("Exported as CSV");
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data)) throw new Error("Invalid format");
        const items = data.map(({ id, ...rest }: Deduction) => rest);
        onImport(items);
        toast.success(`Imported ${items.length} deductions`);
      } catch {
        toast.error("Invalid JSON file. Please use a file exported from this app.");
      }
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
