import { useState } from "react";
import { Deduction } from "@/lib/deduction-data";
import { Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  deductions: Deduction[];
  onDelete: (id: string) => void;
}

export function DeductionList({ deductions, onDelete }: Props) {
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

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
                    onClick={() => setViewingReceipt(d.receiptImage!)}
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

      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            viewingReceipt.startsWith("data:application/pdf") ? (
              <iframe src={viewingReceipt} className="w-full h-[70vh] rounded-lg" title="Receipt PDF" />
            ) : (
              <img src={viewingReceipt} alt="Receipt" className="w-full rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
