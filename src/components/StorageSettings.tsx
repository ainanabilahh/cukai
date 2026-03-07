import { FolderOpen, FolderX, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useFileStorageContext } from "@/contexts/FileStorageContext";

export function StorageSettings() {
  const { isSupported, isReady, directoryName, customDir, pickDirectory, clearDirectory } = useFileStorageContext();

  const handlePick = async () => {
    const ok = await pickDirectory();
    if (ok) toast.success("Storage folder updated!");
  };

  const handleClear = async () => {
    await clearDirectory();
    toast.info("Reverted to default storage.");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-display">Storage Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              File storage is not supported in this environment.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Files Storage Folder</Label>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm break-all flex-1 min-w-0" title={directoryName ?? ""}>
                    {directoryName ?? "No folder selected"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Receipts and uploaded forms are saved to this folder. Changing the folder does not move existing files.
              </p>
              <div className="flex gap-2">
                <Button onClick={handlePick} variant="outline" className="flex-1 gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {isReady && customDir ? "Change Folder" : "Choose Folder"}
                </Button>
                {isReady && customDir && (
                  <Button onClick={handleClear} variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                    <FolderX className="h-4 w-4" />
                    Reset
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
