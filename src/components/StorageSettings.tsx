import { useEffect, useState } from "react";
import { FolderOpen, FolderX, Settings, Sheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { useTaxRatesContext } from "@/contexts/TaxRatesContext";

export function StorageSettings() {
  const { isSupported, isReady, directoryName, hasCustomFolder, folderAccessible, pickDirectory, clearDirectory } = useFileStorageContext();

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
          <DialogTitle className="font-display">Settings</DialogTitle>
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
              {!folderAccessible && (
                <p className="text-xs text-destructive">
                  Cukai can't reach this folder since the last update. Click Change Folder and choose it again.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Receipts and uploaded forms are saved to this folder. Changing the folder does not move existing files.
              </p>
              <div className="flex gap-2">
                <Button onClick={handlePick} variant="outline" className="flex-1 gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {isReady && hasCustomFolder ? "Change Folder" : "Choose Folder"}
                </Button>
                {isReady && hasCustomFolder && (
                  <Button onClick={handleClear} variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                    <FolderX className="h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            </>
          )}
          <Separator />
          <TaxRatesSettings />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaxRatesSettings() {
  const { sheetUrl, fetchedAt, loading, error, sheetYears, setSheetUrl, refresh } = useTaxRatesContext();
  const [draft, setDraft] = useState(sheetUrl ?? "");

  useEffect(() => setDraft(sheetUrl ?? ""), [sheetUrl]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    const ok = draft.trim() === sheetUrl ? await refresh() : await setSheetUrl(draft);
    if (ok) toast.success("Tax rates loaded from your sheet.");
  };

  const handleRemove = async () => {
    await setSheetUrl(null);
    toast.info("Using built-in YA 2025 rates.");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="ratesSheet" className="text-sm font-medium">Tax Rates Sheet</Label>
      <Input
        id="ratesSheet"
        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Relief limits and tax brackets per year. In Google Sheets use File → Share → Publish to web, choose CSV, and paste the link here.
      </p>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : sheetUrl && fetchedAt ? (
        <p className="text-xs text-muted-foreground">
          Years in sheet: {sheetYears.join(", ") || "none"} · updated {new Date(fetchedAt).toLocaleString("en-MY")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No sheet set. Using built-in YA 2025 rates.</p>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} variant="outline" className="flex-1 gap-2" disabled={loading || !draft.trim()}>
          {draft.trim() === sheetUrl ? <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> : <Sheet className="h-4 w-4" />}
          {draft.trim() === sheetUrl ? "Refresh" : "Load Sheet"}
        </Button>
        {sheetUrl && (
          <Button onClick={handleRemove} variant="ghost" className="gap-2 text-destructive hover:text-destructive">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
