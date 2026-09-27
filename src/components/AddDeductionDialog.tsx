import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Upload, X, FileText, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_GROUPS, CATEGORY_NOTES, DeductionCategory, DeductionFrequency, MONTHS } from "@/lib/deduction-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { fileExtension } from "@/hooks/useFileStorage";
import { toast } from "sonner";

interface Props {
  onAdd: (d: { category: DeductionCategory; amount: number; date: string; description: string; receiptImages?: string[]; frequency: DeductionFrequency; month?: string }) => Promise<void>;
  checkDuplicate?: (d: { category: string; amount: number; date: string; description: string }) => boolean;
  year: number;
}

interface ReceiptFile {
  file: File;
  preview: string; // URL or "pdf"
}

export function AddDeductionDialog({ onAdd, checkDuplicate, year }: Props) {
  const fileStorage = useFileStorageContext();
  const [open, setOpen] = useState(false);
  const [showDupeWarning, setShowDupeWarning] = useState(false);
  const [category, setCategory] = useState<DeductionCategory>("Lifestyle");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [receiptFiles, setReceiptFiles] = useState<ReceiptFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [frequency, setFrequency] = useState<DeductionFrequency>("yearly");
  const [month, setMonth] = useState<string>(MONTHS[new Date().getMonth()]);

  const handleDateChange = (d: Date) => {
    setDate(d);
    setMonth(MONTHS[d.getMonth()]);
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newReceipts: ReceiptFile[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast.error(`"${file.name}" is not an image or PDF`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 10MB`);
        continue;
      }
      newReceipts.push({
        file,
        preview: isImage ? URL.createObjectURL(file) : "pdf",
      });
    }

    if (newReceipts.length > 0) {
      setReceiptFiles((prev) => [...prev, ...newReceipts]);
      toast.success(`${newReceipts.length} receipt(s) attached!`);
    }
    e.target.value = "";
  };

  const removeReceipt = (index: number) => {
    setReceiptFiles((prev) => {
      const item = prev[index];
      if (item.preview !== "pdf") URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAllReceipts = () => {
    receiptFiles.forEach((r) => {
      if (r.preview !== "pdf") URL.revokeObjectURL(r.preview);
    });
    setReceiptFiles([]);
  };

  const [saving, setSaving] = useState(false);
  // Yearly claims are stored without a date
  const storedDate = frequency === "monthly" ? format(date, "yyyy-MM-dd") : "";

  const doSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveClaim();
    } finally {
      setSaving(false);
    }
  };

  const saveClaim = async () => {
    const num = parseFloat(amount);
    const savedFileNames: string[] = [];

    if (receiptFiles.length > 0) {
      const storageReady = await fileStorage.ensureReady();
      if (storageReady) {
        for (const receipt of receiptFiles) {
          const id = crypto.randomUUID();
          const fileName = `${year}/receipts/receipt-${id}.${fileExtension(receipt.file)}`;
          const saved = await fileStorage.saveFile(fileName, receipt.file);
          if (!saved) {
            await Promise.all(savedFileNames.map((f) => fileStorage.deleteFile(f)));
            toast.error("Failed to save a receipt to folder");
            return;
          }
          savedFileNames.push(fileName);
        }
      } else {
        // Fallback: convert files to base64 data URLs
        for (const receipt of receiptFiles) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(receipt.file);
          });
          savedFileNames.push(dataUrl);
        }
      }
    }

    try {
      await onAdd({
        category,
        amount: num,
        date: storedDate,
        description: description.trim(),
        receiptImages: savedFileNames.length > 0 ? savedFileNames : undefined,
        frequency,
        month: frequency === "monthly" ? month : undefined,
      });
    } catch (err) {
      console.error("Failed to save claim:", err);
      // Don't leave receipt files behind for a claim that wasn't saved
      await Promise.all(savedFileNames.filter((f) => !f.startsWith("data:")).map((f) => fileStorage.deleteFile(f)));
      toast.error("Couldn't save the claim. Please try again.");
      return;
    }
    toast.success("Claim added successfully!");
    setAmount("");
    setDescription("");
    clearAllReceipts();
    setMonth(MONTHS[new Date().getMonth()]);
    setShowDupeWarning(false);
    setOpen(false);
  };

  /** Returns the amount when the form is complete, otherwise shows why and returns null. */
  const validate = (): number | null => {
    if (receiptFiles.length === 0) {
      toast.error("Please upload at least one receipt");
      return null;
    }
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Please enter a valid amount");
      return null;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return null;
    }
    if (frequency === "monthly" && !month) {
      toast.error("Please select a month");
      return null;
    }
    if (frequency === "monthly" && date.getFullYear() !== year) {
      toast.error(`The date must be in ${year}, the year of assessment you're adding to.`);
      return null;
    }
    return num;
  };

  const handleSubmit = () => {
    if (saving) return;
    const num = validate();
    if (num === null) return;
    if (checkDuplicate && checkDuplicate({ category, amount: num, date: storedDate, description: description.trim() })) {
      setShowDupeWarning(true);
      return;
    }
    doSubmit();
  };

  const handleAddAnyway = () => {
    if (saving || validate() === null) return;
    doSubmit();
  };

  // The duplicate warning only applies to the values it was shown for
  useEffect(() => setShowDupeWarning(false), [category, amount, description, storedDate, frequency]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) clearAllReceipts();
      // Start the date inside the selected year of assessment
      else if (date.getFullYear() !== year) handleDateChange(year === new Date().getFullYear() ? new Date() : new Date(year, 11, 31));
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-display font-semibold">
          <Plus className="h-4 w-4" />
          Add Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Tax Claim</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Receipts <span className="text-destructive">*</span></Label>

            {/* Show uploaded receipts */}
            {receiptFiles.length > 0 && (
              <div className="space-y-2">
                {receiptFiles.map((r, i) => (
                  <div key={i} className="relative rounded-lg border overflow-hidden">
                    {r.preview === "pdf" ? (
                      <div className="flex items-center gap-2 p-3 bg-muted">
                        <FileText className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium truncate flex-1">{r.file.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-muted">
                        <img src={r.preview} alt="Receipt" className="h-12 w-12 object-cover rounded" />
                        <span className="text-sm truncate flex-1">{r.file.name}</span>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeReceipt(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                {receiptFiles.length > 0 ? "Add more receipts" : "Click to upload receipts (images or PDFs)"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Category <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {category || "Select category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList className="max-h-60">
                    <CommandEmpty>No category found.</CommandEmpty>
                    {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                      <CommandGroup key={group} heading={group}>
                        {cats.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => setCategory(c)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", category === c ? "opacity-100" : "opacity-0")} />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {CATEGORY_NOTES[category] && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 leading-relaxed">
                💡 {CATEGORY_NOTES[category]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Frequency <span className="text-destructive">*</span></Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as DeductionFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly (annual statement)</SelectItem>
                <SelectItem value="monthly">Monthly (per month proof)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (RM) <span className="text-destructive">*</span></Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
          </div>
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && handleDateChange(d)} defaultMonth={date} fromYear={year} toYear={year} disabled={(d) => d.getFullYear() !== year} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Month <span className="text-destructive">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Pharmacy medicine" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {showDupeWarning && (
            <div className="rounded-lg border border-warning bg-warning/10 p-3 space-y-2">
              <p className="text-sm font-medium text-warning">⚠ Possible duplicate detected</p>
              <p className="text-xs text-muted-foreground">A claim with the same category, amount, date, and description already exists.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowDupeWarning(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddAnyway} disabled={saving}>Add Anyway</Button>
              </div>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={saving} className="w-full font-display font-semibold">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
