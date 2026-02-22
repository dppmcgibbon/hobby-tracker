"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ImagePlus } from "lucide-react";
import { importPhotosOnlyFromStoragePath } from "@/app/actions/backup";
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

export function ImportPhotosOnlyButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".zip")) {
        toast.error("Please select a backup ZIP file (from the app export)");
        return;
      }
      setPendingFile(file);
      setShowConfirm(true);
    }
  };

  const handleConfirm = async () => {
    if (!pendingFile) return;

    setShowConfirm(false);
    setIsImporting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be signed in to import");
      }

      const storagePath = `${user.id}/import-photos-${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from(BACKUP_IMPORTS_BUCKET)
        .upload(storagePath, pendingFile, {
          contentType: "application/zip",
          upsert: true,
        });

      if (uploadError) {
        const msg = uploadError.message || "Unknown error";
        const hint =
          uploadError.message?.toLowerCase().includes("bucket") || uploadError.message?.toLowerCase().includes("400")
            ? " Ensure the backup-imports bucket exists: run supabase db push on your project."
            : "";
        throw new Error(`Upload failed: ${msg}${hint}`);
      }

      const result = await importPhotosOnlyFromStoragePath(storagePath);

      if (!result.success) {
        throw new Error(result.error ?? result.photoErrors[0] ?? "Import failed");
      }

      if (result.uploadedPhotos === 0 && result.photoErrors.length > 0 && result.photoErrors[0].includes("No photos")) {
        toast.info(result.photoErrors[0]);
      } else if (result.failedPhotos > 0) {
        toast.warning(
          `Photos imported: ${result.uploadedPhotos} uploaded, ${result.failedPhotos} failed. Check console for details.`
        );
        if (result.photoErrors.length > 0) console.error("Photo errors:", result.photoErrors);
      } else {
        toast.success(
          `Photos imported: ${result.uploadedPhotos} photo${result.uploadedPhotos !== 1 ? "s" : ""} uploaded. No database rows changed.`
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Import photos error:", error);
      toast.error(
        error instanceof Error
          ? `Failed to import photos: ${error.message}`
          : "Failed to import photos. Please try again."
      );
    } finally {
      setIsImporting(false);
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
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
        id="import-photos-only-input"
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
            Importing photos...
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            Choose backup ZIP
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent aria-describedby="import-photos-only-description">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />
              Import photos only
            </AlertDialogTitle>
            <AlertDialogDescription id="import-photos-only-description" asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                <p>
                  This will extract and upload only the photos from the backup ZIP. Use a ZIP created by the app&apos;s
                  &quot;Backup Database&quot; export.
                </p>
                <p className="font-medium">No database rows will be imported or changed.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Import photos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
