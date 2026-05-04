"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUniversePhotosBackup } from "@/app/actions/backup";
import { toast } from "sonner";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";

type UniverseOption = { id: string; name: string };

function safeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "universe";
}

export function UniverseBackupSection({ universes }: { universes: UniverseOption[] }) {
  const [universeId, setUniverseId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!universeId) {
      toast.error("Select a universe first.");
      return;
    }

    setIsExporting(true);
    try {
      const result = await createUniversePhotosBackup(universeId);

      if (!result.success || !result.photoFiles) {
        throw new Error("Export failed");
      }

      const zip = new JSZip();

      for (const { path, blob } of result.photoFiles) {
        zip.file(`photos/${path}`, blob);
      }

      const metadata = {
        backupDate: result.timestamp,
        universePhotosExport: true,
        universeId: result.universeId,
        universeName: result.universeName,
        miniatureCount: result.miniatureCount,
        universeGameCount: result.universeGameCount,
        photoRowCount: result.photoRowCount,
        photoFilesDownloaded: result.photoFiles.length,
      };

      zip.file("backup_metadata.json", JSON.stringify(metadata, null, 2));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const namePart = safeFilenamePart(result.universeName ?? "universe");
      link.download = `hobby-tracker-universe-photos-${namePart}-${timestamp}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Downloaded ${metadata.photoFilesDownloaded} of ${metadata.photoRowCount} photo files for ${metadata.miniatureCount ?? 0} miniatures in this universe.`
      );
    } catch (error) {
      console.error("Universe backup error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export universe.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-2 min-w-[220px] flex-1 max-w-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Universe</p>
        <Select value={universeId} onValueChange={setUniverseId} disabled={universes.length === 0}>
          <SelectTrigger aria-label="Select universe to export">
            <SelectValue placeholder={universes.length === 0 ? "No universes" : "Choose universe…"} />
          </SelectTrigger>
          <SelectContent>
            {universes.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        onClick={handleDownload}
        disabled={isExporting || !universeId || universes.length === 0}
        variant="outline"
        className="gap-2 w-fit"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download universe photos
          </>
        )}
      </Button>
    </div>
  );
}
