import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, DeductionCategory } from "@/lib/deduction-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  onAdd: (d: { category: DeductionCategory; amount: number; date: string; description: string }) => void;
}

export function AddDeductionDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DeductionCategory>("Gaya Hidup");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error("Sila masukkan jumlah yang sah");
      return;
    }
    if (!description.trim()) {
      toast.error("Sila masukkan keterangan");
      return;
    }
    onAdd({ category, amount: num, date: format(date, "yyyy-MM-dd"), description: description.trim() });
    toast.success("Potongan berjaya ditambah!");
    setAmount("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-display font-semibold">
          <Plus className="h-4 w-4" />
          Tambah Potongan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Tambah Potongan Cukai</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DeductionCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jumlah (RM)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label>Tarikh</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd MMM yyyy") : "Pilih tarikh"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Input placeholder="cth: Ubat farmasi" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} className="w-full font-display font-semibold">Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
