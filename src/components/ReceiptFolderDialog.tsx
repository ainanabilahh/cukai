import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (folderName: string) => void;
  defaultFolderName: string;
  fileName: string;
  year: number;
}

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ReceiptFolderDialog({ open, onClose, onConfirm, defaultFolderName, fileName, year }: Props) {
  const [folderName, setFolderName] = useState(sanitizeFolderName(defaultFolderName));

  const sanitized = sanitizeFolderName(folderName);
  const previewPath = `${year}/receipts/${sanitized || "unnamed"}/${fileName}`;

  const handleConfirm = () => {
    onConfirm(sanitized || "unnamed");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Save Receipt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. umobile, electric-bill"
            />
            <p className="text-xs text-muted-foreground">
              Auto-filled from description. Edit if needed.
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">File will be saved as:</p>
            <p className="text-sm font-mono break-all">{previewPath}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Save Receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
