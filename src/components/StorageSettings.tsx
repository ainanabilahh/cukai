import { Settings, FolderOpen, FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  isSupported: boolean;
  isReady: boolean;
  directoryName: string | null;
  onPickDirectory: () => Promise<boolean>;
  onChangeDirectory: () => Promise<boolean>;
  onClearDirectory: () => Promise<void>;
}

export function StorageSettings({ isSupported, isReady, directoryName, onPickDirectory, onChangeDirectory, onClearDirectory }: Props) {
  const handleChange = async () => {
    const ok = await onChangeDirectory();
    if (ok) toast.success("Storage folder updated!");
  };

  const handleClear = async () => {
    await onClearDirectory();
    toast.info("Storage folder removed. You'll be prompted again on next upload.");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Storage Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support the File System Access API. Uploaded files will be stored in browser storage instead.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Storage Folder</Label>
                {isReady && directoryName ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{directoryName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 p-3">
                    <FolderX className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">No folder selected</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Uploaded receipts and EA forms are saved directly to this folder on your device.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleChange} variant="outline" className="flex-1 gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {isReady ? "Change Folder" : "Choose Folder"}
                </Button>
                {isReady && (
                  <Button onClick={handleClear} variant="ghost" className="text-destructive hover:text-destructive">
                    Remove
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
