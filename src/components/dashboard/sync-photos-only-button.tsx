"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { syncPhotosOnly } from "@/app/actions/storage-sync";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SyncPhotosOnlyButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPhotosOnly();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.total === 0) {
        toast.info("No photos to sync in local storage.");
      } else {
        toast.success(
          `Photos synced: ${result.uploaded} uploaded${result.errors > 0 ? `, ${result.errors} failed` : ""} (${result.total} total). No database rows changed.`
        );
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="gap-2"
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing photos...
        </>
      ) : (
        <>
          <ImagePlus className="h-4 w-4" />
          Sync photos only
        </>
      )}
    </Button>
  );
}
