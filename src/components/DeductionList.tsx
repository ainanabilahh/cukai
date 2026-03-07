import { useState } from "react";
import { Deduction } from "@/lib/deduction-data";
import { Trash2, ImageIcon, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { toast } from "sonner";

interface Props {
  deductions: Deduction[];
  onDelete: (id: string) => void;
}

export function DeductionList({ deductions, onDelete }: Props) {
  const fileStorage = useFileStorageContext();
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; type: string; deduction: Deduction } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleViewReceipt = async (deduction: Deduction) => {
    const receiptImage = deduction.receiptImage!;
    // Legacy: base64 data URL
    if (receiptImage.startsWith("data:")) {
      const type = receiptImage.startsWith("data:application/pdf") ? "pdf" : "image";
      setViewingReceipt({ url: receiptImage, type, deduction });
      setZoom(1);
      setRotation(0);
      return;
    }
    // New: filename in storage folder
    if (fileStorage.isReady) {
      const url = await fileStorage.readFile(receiptImage);
      if (url) {
        const type = receiptImage.endsWith(".pdf") ? "pdf" : "image";
        setViewingReceipt({ url, type, deduction });
        setZoom(1);
        setRotation(0);
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
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!viewingReceipt) return;
    const a = document.createElement("a");
    a.href = viewingReceipt.url;
    a.download = viewingReceipt.deduction.receiptImage || "receipt";
    a.click();
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
                    onClick={() => handleViewReceipt(d)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    title="View receipt"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">View</span>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>

          {viewingReceipt && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1">
              {/* Deduction details */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{viewingReceipt.deduction.category}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {viewingReceipt.deduction.frequency === "monthly" ? viewingReceipt.deduction.month : "Yearly"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{viewingReceipt.deduction.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">{viewingReceipt.deduction.description}</p>
                  <span className="font-display font-semibold text-primary">
                    RM {viewingReceipt.deduction.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Image controls (only for images, not PDFs) */}
              {viewingReceipt.type === "image" && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Receipt viewer */}
              <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 min-h-0">
                {viewingReceipt.type === "pdf" ? (
                  <iframe src={viewingReceipt.url} className="w-full h-[60vh] rounded-lg" title="Receipt PDF" />
                ) : (
                  <div className="flex items-center justify-center p-4 overflow-auto h-[60vh]">
                    <img
                      src={viewingReceipt.url}
                      alt="Receipt"
                      className="max-w-full rounded-lg transition-transform duration-200"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
