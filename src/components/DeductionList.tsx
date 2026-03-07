import { useState } from "react";
import { Deduction, CATEGORY_LIMITS, DeductionCategory } from "@/lib/deduction-data";
import { Trash2, ImageIcon, Eye, Paperclip, ZoomIn, ZoomOut, RotateCw, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { toast } from "sonner";

interface Props {
  deductions: Deduction[];
  onDelete: (id: string) => void;
  onAttachReceipt?: (id: string, receiptFileName: string) => void;
}

export function DeductionList({ deductions, onDelete, onAttachReceipt }: Props) {
  const fileStorage = useFileStorageContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; type: string; deduction: Deduction } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleViewReceipt = async (deduction: Deduction) => {
    const receiptImage = deduction.receiptImage!;
    if (receiptImage.startsWith("data:")) {
      const type = receiptImage.startsWith("data:application/pdf") ? "pdf" : "image";
      setViewingReceipt({ url: receiptImage, type, deduction });
      setZoom(1);
      setRotation(0);
      return;
    }
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

  const ensureStorage = async (): Promise<boolean> => {
    if (!fileStorage.isSupported) return false;
    if (fileStorage.isReady) return true;
    toast.info("Please choose a folder to save your files");
    return await fileStorage.pickDirectory();
  };

  const handleAttachReceipt = async (deduction: Deduction, file: File) => {
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
    const storageReady = await ensureStorage();
    if (storageReady) {
      const ext = isImage ? "jpg" : "pdf";
      const fileName = `receipt-${deduction.id}.${ext}`;
      const saved = await fileStorage.saveFile(fileName, file);
      if (!saved) {
        toast.error("Failed to save receipt");
        return;
      }
      onAttachReceipt?.(deduction.id, fileName);
      toast.success("Receipt attached!");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
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
        {deductions.map((d) => {
          const isExpanded = expandedId === d.id;
          const limit = CATEGORY_LIMITS[d.category as DeductionCategory];
          const hasLimit = limit !== Infinity;

          return (
            <div
              key={d.id}
              className="rounded-lg border bg-card transition-colors overflow-hidden"
            >
              {/* Clickable row */}
              <div
                role="button"
                tabIndex={0}
                className="flex items-center justify-between w-full p-4 text-left transition-colors hover:bg-secondary/50 cursor-pointer"
                onClick={() => toggleExpand(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpand(d.id);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-medium">{d.category}</Badge>
                    <Badge variant="outline" className="text-xs">{d.frequency === "monthly" ? d.month : "Yearly"}</Badge>
                    <span className="text-xs text-muted-foreground">{d.date}</span>
                    {d.receiptImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipt(d);
                        }}
                        title="View receipt"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm truncate">{d.description}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-display font-semibold text-primary whitespace-nowrap">
                    RM {d.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Category</p>
                      <p className="font-medium">{d.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Amount</p>
                      <p className="font-display font-semibold text-primary">
                        RM {d.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Date</p>
                      <p>{d.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Frequency</p>
                      <p>{d.frequency === "monthly" ? `Monthly — ${d.month}` : "Yearly"}</p>
                    </div>
                    {hasLimit && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Category Limit</p>
                        <p>RM {limit.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Description</p>
                      <p>{d.description}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    {d.receiptImage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipt(d);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Receipt
                      </Button>
                    ) : (
                      <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none">
                          <Paperclip className="h-3.5 w-3.5" />
                          Attach Receipt
                        </Button>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAttachReceipt(d, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!viewingReceipt} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>

          {viewingReceipt && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1">
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

              {viewingReceipt.type === "image" && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} disabled={zoom <= 0.5}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} disabled={zoom >= 3}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 min-h-0">
                {viewingReceipt.type === "pdf" ? (
                  <iframe src={viewingReceipt.url} className="w-full h-[60vh] rounded-lg" title="Receipt PDF" />
                ) : (
                  <div className="flex items-center justify-center p-4 overflow-auto h-[60vh]">
                    <img
                      src={viewingReceipt.url}
                      alt="Receipt"
                      className="max-w-full rounded-lg transition-transform duration-200"
                      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center center" }}
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
