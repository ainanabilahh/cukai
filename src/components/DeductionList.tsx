import { useState } from "react";
import { Deduction } from "@/lib/deduction-data";
import { Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { toast } from "sonner";

interface Props {
  deductions: Deduction[];
  onDelete: (id: string) => void;
}

export function DeductionList({ deductions, onDelete }: Props) {
  const fileStorage = useFileStorageContext();
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; type: string } | null>(null);

  const handleViewReceipt = async (receiptImage: string) => {
    // Legacy: base64 data URL
    if (receiptImage.startsWith("data:")) {
      const type = receiptImage.startsWith("data:application/pdf") ? "pdf" : "image";
      setViewingReceipt({ url: receiptImage, type });
      return;
    }
    // New: filename in storage folder
    if (fileStorage.isReady) {
      const url = await fileStorage.readFile(receiptImage);
      if (url) {
        const type = receiptImage.endsWith(".pdf") ? "pdf" : "image";
        setViewingReceipt({ url, type });
        return;
      }
    }
    toast.error("Cannot view receipt. Ensure storage folder is accessible in Settings.");
  };

  const handleClose = () => {
    if (viewingReceipt && !viewingReceipt.url.startsWith("data:")) {
      URL.revokeObjectURL(viewingReceipt.url);
    }
    setViewingReceipt(null);
  };

  if (deductions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg">No deductions yet</p>
        <p className="text-sm">Click "Add Deduction" to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {deductions.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className="text-xs font-medium">{d.category}</Badge>
                <Badge variant="outline" className="text-xs">{d.frequency === "monthly" ? d.month : "Yearly"}</Badge>
                <span className="text-xs text-muted-foreground">{d.date}</span>
                {d.receiptImage && (
                  <button
                    onClick={() => handleViewReceipt(d.receiptImage!)}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="View receipt"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm truncate">{d.description}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="font-display font-semibold text-primary whitespace-nowrap">
                RM {d.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(d.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!viewingReceipt} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            viewingReceipt.type === "pdf" ? (
              <iframe src={viewingReceipt.url} className="w-full h-[70vh] rounded-lg" title="Receipt PDF" />
            ) : (
              <img src={viewingReceipt.url} alt="Receipt" className="w-full rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
