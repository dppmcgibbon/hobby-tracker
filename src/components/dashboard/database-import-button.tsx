"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { importDatabaseBackupFromStoragePath } from "@/app/actions/backup";
import { BACKUP_IMPORTS_BUCKET } from "@/lib/backup-imports";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export function DatabaseImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".zip")) {
        toast.error("Please select a valid backup ZIP file");
        return;
      }
      setPendingFile(file);
      setShowWarning(true);
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingFile) return;

    setShowWarning(false);
    setIsImporting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to import");
      }

      // Upload ZIP to storage first so the server action only receives a path (avoids 413 on Vercel)
      const storagePath = `${user.id}/import-${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from(BACKUP_IMPORTS_BUCKET)
        .upload(storagePath, pendingFile, { contentType: "application/zip", upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const result = await importDatabaseBackupFromStoragePath(storagePath);

      if (!result.success) {
        throw new Error(result.error ?? result.photoErrors[0] ?? "Import failed");
      }

      const photoMessage =
        result.uploadedPhotos > 0
          ? `, ${result.uploadedPhotos} photo${result.uploadedPhotos !== 1 ? "s" : ""} uploaded${result.failedPhotos > 0 ? `, ${result.failedPhotos} failed` : ""}`
          : "";

      if (result.failedPhotos > 0 && result.photoErrors.length > 0) {
        console.error("Photo upload errors:", result.photoErrors);
        toast.warning(
          `Database imported with warnings: ${result.uploadedPhotos} photos uploaded, ${result.failedPhotos} failed. Check console for details.`
        );
      } else {
        toast.success(
          `Database imported successfully! ${result.totalRows ?? 0} rows restored across ${
            result.results ? Object.keys(result.results).length : 0
          } tables${photoMessage}`
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error
          ? `Failed to import database: ${error.message}`
          : "Failed to import database. Please try again."
      );
    } finally {
      setIsImporting(false);
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportCancel = () => {
    setShowWarning(false);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="hidden"
        id="backup-file-input"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        variant="outline"
        className="gap-2"
      >
        {isImporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Import Database
          </>
        )}
      </Button>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Warning: Data Will Be Replaced
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                <div className="font-semibold">
                  This action will permanently replace ALL your current data with the backup file.
                </div>
                <div>The following will be deleted and replaced:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>All miniatures and their photos</li>
                  <li>All collections</li>
                  <li>All painting recipes</li>
                  <li>All tags and storage boxes</li>
                  <li>All personal data and settings</li>
                </ul>
                <div className="font-semibold text-destructive">
                  This action cannot be undone. Make sure you have a current backup before proceeding.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleImportCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replace All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
