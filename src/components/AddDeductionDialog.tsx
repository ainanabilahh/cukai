import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Upload, X, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_GROUPS, DeductionCategory, DeductionFrequency, MONTHS } from "@/lib/deduction-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  onAdd: (d: { category: DeductionCategory; amount: number; date: string; description: string; receiptImage?: string; frequency: DeductionFrequency; month?: string }) => void;
  checkDuplicate?: (d: { category: string; amount: number; date: string; description: string }) => boolean;
}

function compressImage(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddDeductionDialog({ onAdd, checkDuplicate }: Props) {
  const [open, setOpen] = useState(false);
  const [showDupeWarning, setShowDupeWarning] = useState(false);
  const [category, setCategory] = useState<DeductionCategory>("Lifestyle");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [frequency, setFrequency] = useState<DeductionFrequency>("yearly");
  const [month, setMonth] = useState<string>(MONTHS[new Date().getMonth()]);

  const handleDateChange = (d: Date) => {
    setDate(d);
    setMonth(MONTHS[d.getMonth()]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Please upload an image or PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      if (isImage) {
        const compressed = await compressImage(file);
        setReceiptImage(compressed);
      } else {
        // Store PDF as base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setReceiptImage(dataUrl);
      }
      toast.success("Receipt uploaded!");
    } catch {
      toast.error("Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  const doSubmit = () => {
    const num = parseFloat(amount);
    onAdd({
      category,
      amount: num,
      date: format(date, "yyyy-MM-dd"),
      description: description.trim(),
      receiptImage: receiptImage || undefined,
      frequency,
      month: frequency === "monthly" ? month : undefined,
    });
    toast.success("Deduction added successfully!");
    setAmount("");
    setDescription("");
    setReceiptImage(null);
    setMonth("");
    setShowDupeWarning(false);
    setOpen(false);
  };

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (frequency === "monthly" && !month) {
      toast.error("Please select a month");
      return;
    }
    // Duplicate check
    if (checkDuplicate && checkDuplicate({ category, amount: num, date: format(date, "yyyy-MM-dd"), description: description.trim() })) {
      setShowDupeWarning(true);
      return;
    }
    doSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-display font-semibold">
          <Plus className="h-4 w-4" />
          Add Deduction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Tax Deduction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            {receiptImage ? (
              <div className="relative rounded-lg border overflow-hidden">
                {receiptImage.startsWith("data:application/pdf") ? (
                  <div className="flex items-center gap-2 p-4 bg-muted">
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">PDF Receipt attached</span>
                  </div>
                ) : (
                  <img src={receiptImage} alt="Receipt" className="w-full max-h-48 object-contain bg-muted" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setReceiptImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Processing..." : "Click to upload receipt (image or PDF)"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DeductionCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                  <SelectGroup key={group}>
                    <SelectLabel className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">{group}</SelectLabel>
                    {cats.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as DeductionFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly (annual statement)</SelectItem>
                <SelectItem value="monthly">Monthly (per month proof)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (RM)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && handleDateChange(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Month</Label>
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
            <Label>Description</Label>
            <Input placeholder="e.g. Pharmacy medicine" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {showDupeWarning && (
            <div className="rounded-lg border border-warning bg-warning/10 p-3 space-y-2">
              <p className="text-sm font-medium text-warning">⚠ Possible duplicate detected</p>
              <p className="text-xs text-muted-foreground">A deduction with the same category, amount, date, and description already exists.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowDupeWarning(false)}>Cancel</Button>
                <Button size="sm" onClick={doSubmit}>Add Anyway</Button>
              </div>
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full font-display font-semibold">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
