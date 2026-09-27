import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EAForm, EAFormsState } from "@/hooks/useEAForms";
import { formatRM } from "@/lib/tax-calculator";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { fileExtension } from "@/lib/files";
import { toast } from "sonner";

interface EAFormSectionProps {
  year: number;
  ea: EAFormsState; // shared with the tax estimate, which uses the forms' amounts
}

/** Parses an optional ringgit amount; blank means "not entered". */
function parseAmount(text: string): number | null | "invalid" {
  const t = text.replace(/[,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

export function EAFormSection({ year, ea }: EAFormSectionProps) {
  const { forms, addForm, updateAmounts, deleteForm, employerNames, defaultEmployer } = ea;
  const [incomeText, setIncomeText] = useState("");
  const [pcbText, setPcbText] = useState("");
  const [editing, setEditing] = useState<{ form: EAForm; income: string; pcb: string } | null>(null);
  const fileStorage = useFileStorageContext();
  const [employerName, setEmployerName] = useState("");
  const [employerEdited, setEmployerEdited] = useState(false);
  // Prefill with last year's employer until the user types something themselves
  useEffect(() => {
    if (!employerEdited && defaultEmployer) setEmployerName(defaultEmployer);
  }, [defaultEmployer, employerEdited]);
  const [uploading, setUploading] = useState(false);
  const [viewingForm, setViewingForm] = useState<EAForm | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again after an error
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Please upload an image or PDF file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }
    if (!employerName.trim()) {
      toast.error("Please enter employer name first");
      return;
    }
    const totalIncome = parseAmount(incomeText);
    const pcb = parseAmount(pcbText);
    if (totalIncome === "invalid" || pcb === "invalid") {
      toast.error("Income and PCB must be amounts in RM, or left blank");
      return;
    }

    // Ensure storage folder is selected (one-time prompt)
    const storageReady = await fileStorage.ensureReady();
    if (!storageReady) {
      toast.error("Choose a storage folder in Settings to save your forms.");
      return;
    }
    
    setUploading(true);
    let savedPath: string | null = null;
    try {
      const id = crypto.randomUUID();
      const ext = fileExtension(file);
      const fileName = `${year}/ea-form/ea-form-${id}.${ext}`;

      const saved = await fileStorage.saveFile(fileName, file);
      if (!saved) {
        toast.error("Failed to save file to folder");
        return;
      }
      savedPath = fileName;

      await addForm({
        employerName: employerName.trim(),
        fileName,
        fileType: isImage ? "image" : "pdf",
        totalIncome,
        pcb,
      });
      setIncomeText("");
      setPcbText("");
      setEmployerEdited(false); // go back to the suggested employer for the next form
      toast.success("EA Form uploaded!");
    } catch (err) {
      console.error(`EA form upload failed:`, err);
      if (savedPath) await fileStorage.deleteFile(savedPath); // no record points at it
      toast.error("Failed to save the form. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (form: EAForm) => {
    if (fileStorage.isReady) {
      const url = await fileStorage.readFile(form.fileName);
      if (url) {
        setViewUrl(url);
        setViewingForm(form);
        return;
      }
    }
    toast.error("Cannot view file. Please ensure storage folder is accessible in Settings.");
  };

  const handleDelete = async (form: EAForm) => {
    try {
      await deleteForm(form.id); // remove the record first so it never points at a missing file
    } catch (err) {
      console.error("Couldn't delete EA form:", err);
      toast.error("Couldn't delete the form.");
      return;
    }
    if (fileStorage.isReady) await fileStorage.deleteFile(form.fileName);
  };

  const handleCloseView = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    setViewUrl(null);
    setViewingForm(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            EA Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Employer Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Syarikat ABC Sdn Bhd"
                value={employerName}
                list="employer-names"
                autoComplete="off"
                onChange={(e) => { setEmployerEdited(true); setEmployerName(e.target.value); }}
              />
              <datalist id="employer-names">
                {employerNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ea-income">Total income (RM)</Label>
                <Input id="ea-income" inputMode="decimal" placeholder="Optional" value={incomeText} onChange={(e) => setIncomeText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ea-pcb">PCB (RM)</Label>
                <Input id="ea-pcb" inputMode="decimal" placeholder="Optional" value={pcbText} onChange={(e) => setPcbText(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">From the EA form (Section B total and Section D PCB). Used to fill in the tax estimate.</p>
            <label
              className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 ${!employerName.trim() ? "opacity-60" : ""}`}
              onClick={(e) => {
                if (!employerName.trim()) {
                  e.preventDefault();
                  toast.error("Please enter employer name first");
                }
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {uploading ? "Processing..." : "Upload EA Form (image or PDF)"}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* List */}
          {forms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No EA forms uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{form.employerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {form.totalIncome !== null || form.pcb !== null
                          ? `Income RM ${formatRM(form.totalIncome ?? 0)} • PCB RM ${formatRM(form.pcb ?? 0)}`
                          : `${form.fileType === "pdf" ? "PDF" : "Image"} • no amounts yet`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit amounts"
                      onClick={() => setEditing({ form, income: form.totalIncome?.toString() ?? "", pcb: form.pcb?.toString() ?? "" })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(form)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(form)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingForm} onOpenChange={handleCloseView}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">EA Form — {viewingForm?.employerName}</DialogTitle>
          </DialogHeader>
          {viewingForm && viewUrl && (
            viewingForm.fileType === "pdf" ? (
              <iframe src={viewUrl} className="w-full h-[70vh] rounded-lg" title="EA Form" />
            ) : (
              <img src={viewUrl} alt="EA Form" className="w-full rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">EA amounts — {editing?.form.employerName}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-income">Total income (RM)</Label>
                <Input id="edit-income" inputMode="decimal" value={editing.income} onChange={(e) => setEditing({ ...editing, income: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pcb">PCB (RM)</Label>
                <Input id="edit-pcb" inputMode="decimal" value={editing.pcb} onChange={(e) => setEditing({ ...editing, pcb: e.target.value })} />
              </div>
              <Button className="w-full" onClick={async () => {
                const income = parseAmount(editing.income);
                const pcb = parseAmount(editing.pcb);
                if (income === "invalid" || pcb === "invalid") {
                  toast.error("Income and PCB must be amounts in RM, or left blank");
                  return;
                }
                try {
                  await updateAmounts(editing.form.id, income, pcb);
                  setEditing(null);
                  toast.success("Amounts saved");
                } catch (err) {
                  console.error("Couldn't save EA amounts:", err);
                  toast.error("Couldn't save the amounts.");
                }
              }}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
