import { useState } from "react";
import { Deduction, CATEGORY_LIMITS, DeductionCategory } from "@/lib/deduction-data";
import { Trash2, Eye, Paperclip, ZoomIn, ZoomOut, RotateCw, Download, ChevronDown, ChevronUp, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [viewingReceipt, setViewingReceipt] = useState<{ urls: { url: string; type: string }[]; currentIndex: number; deduction: Deduction } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const resolveReceiptUrl = async (fileName: string): Promise<{ url: string; type: string } | null> => {
    if (fileName.startsWith("data:")) {
      return { url: fileName, type: fileName.startsWith("data:application/pdf") ? "pdf" : "image" };
    }
    if (fileStorage.isReady) {
      const url = await fileStorage.readFile(fileName);
      if (url) {
        return { url, type: fileName.endsWith(".pdf") ? "pdf" : "image" };
      }
    }
    return null;
  };

  const handleViewReceipts = async (deduction: Deduction) => {
    const images = deduction.receiptImages || [];
    if (images.length === 0) return;

    const resolved: { url: string; type: string }[] = [];
    for (const img of images) {
      const result = await resolveReceiptUrl(img);
      if (result) resolved.push(result);
    }

    if (resolved.length === 0) {
      toast.error("Cannot view receipts. Ensure storage folder is accessible in Settings.");
      return;
    }

    setViewingReceipt({ urls: resolved, currentIndex: 0, deduction });
    setZoom(1);
    setRotation(0);
  };

  const handleClose = () => {
    if (viewingReceipt) {
      viewingReceipt.urls.forEach((u) => {
        if (!u.url.startsWith("data:")) URL.revokeObjectURL(u.url);
      });
    }
    setViewingReceipt(null);
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!viewingReceipt) return;
    const current = viewingReceipt.urls[viewingReceipt.currentIndex];
    const a = document.createElement("a");
    a.href = current.url;
    a.download = `receipt-${viewingReceipt.currentIndex + 1}`;
    a.click();
  };

  const navigateReceipt = (dir: number) => {
    if (!viewingReceipt) return;
    const newIndex = viewingReceipt.currentIndex + dir;
    if (newIndex < 0 || newIndex >= viewingReceipt.urls.length) return;
    setViewingReceipt({ ...viewingReceipt, currentIndex: newIndex });
    setZoom(1);
    setRotation(0);
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

    // Try saving to file system storage first
    const storageReady = await ensureStorage();
    if (storageReady) {
      const ext = isImage ? "jpg" : "pdf";
      const fileName = `receipt-${crypto.randomUUID()}.${ext}`;
      const saved = await fileStorage.saveFile(fileName, file);
      if (!saved) {
        toast.error("Failed to save receipt");
        return;
      }
      onAttachReceipt?.(deduction.id, fileName);
      toast.success("Receipt attached!");
      return;
    }

    // Fallback: store as base64 data URL when file system not available
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onAttachReceipt?.(deduction.id, dataUrl);
      toast.success("Receipt attached!");
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsDataURL(file);
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

  const currentReceipt = viewingReceipt ? viewingReceipt.urls[viewingReceipt.currentIndex] : null;

  return (
    <>
      <div className="space-y-2">
        {deductions.map((d) => {
          const isExpanded = expandedId === d.id;
          const limit = CATEGORY_LIMITS[d.category as DeductionCategory];
          const hasLimit = limit !== Infinity;
          const receiptCount = d.receiptImages?.length || 0;

          return (
            <div key={d.id} className="rounded-lg border bg-card transition-colors overflow-hidden">
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
                    {receiptCount > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:text-primary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipts(d);
                        }}
                        title={`View ${receiptCount} receipt(s)`}
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
                    {receiptCount > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Receipts</p>
                        <p>{receiptCount} file(s) attached</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    {receiptCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipts(d);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Receipts ({receiptCount})
                      </Button>
                    )}
                    <label className="cursor-pointer inline-flex" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
                        <Paperclip className="h-3.5 w-3.5" />
                        Add Receipt
                      </span>
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
            <DialogTitle className="font-display">
              Receipt {viewingReceipt && viewingReceipt.urls.length > 1 && `(${viewingReceipt.currentIndex + 1} of ${viewingReceipt.urls.length})`}
            </DialogTitle>
          </DialogHeader>

          {viewingReceipt && currentReceipt && (
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

              <div className="flex items-center justify-center gap-2">
                {viewingReceipt.urls.length > 1 && (
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateReceipt(-1)} disabled={viewingReceipt.currentIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {currentReceipt.type === "image" && (
                  <>
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
                  </>
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
                {viewingReceipt.urls.length > 1 && (
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateReceipt(1)} disabled={viewingReceipt.currentIndex === viewingReceipt.urls.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 min-h-0">
                {currentReceipt.type === "pdf" ? (
                  <iframe src={currentReceipt.url} className="w-full h-[60vh] rounded-lg" title="Receipt PDF" />
                ) : (
                  <div className="flex items-center justify-center p-4 overflow-auto h-[60vh]">
                    <img
                      src={currentReceipt.url}
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
