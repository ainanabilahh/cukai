import { useState } from "react";
import { Upload, FileText, Trash2, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEAForms, EAForm } from "@/hooks/useEAForms";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { toast } from "sonner";

export function EAFormSection() {
  const { forms, addForm, deleteForm } = useEAForms();
  const fileStorage = useFileStorageContext();
  const [employerName, setEmployerName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewingForm, setViewingForm] = useState<EAForm | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const ensureStorage = async (): Promise<boolean> => {
    if (!fileStorage.isSupported) return false;
    if (fileStorage.isReady) return true;
    toast.info("Please choose a folder to save your files");
    return await fileStorage.pickDirectory();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    // Ensure storage folder is selected (one-time prompt)
    const storageReady = await ensureStorage();
    
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const ext = isImage ? "jpg" : "pdf";
      const fileName = `ea-form-${id}.${ext}`;

      if (storageReady) {
        // Save to device folder
        const saved = await fileStorage.saveFile(fileName, file);
        if (!saved) {
          toast.error("Failed to save file to folder");
          return;
        }
      }

      addForm({
        employerName: employerName.trim(),
        fileName,
        fileType: isImage ? "image" : "pdf",
      });
      setEmployerName("");
      toast.success("EA Form uploaded!");
    } catch {
      toast.error("Failed to process file");
    } finally {
      setUploading(false);
      e.target.value = "";
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
    if (fileStorage.isReady) {
      await fileStorage.deleteFile(form.fileName);
    }
    deleteForm(form.id);
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
          <CardTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            EA Forms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Employer Name</Label>
              <Input
                placeholder="e.g. Syarikat ABC Sdn Bhd"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
              />
            </div>
            <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
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
                disabled={uploading || !employerName.trim()}
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
                        {form.fileType === "pdf" ? "PDF" : "Image"} • {new Date(form.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
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
    </>
  );
}
