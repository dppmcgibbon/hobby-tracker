"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { importDatabaseBackup, updatePhotoPathsAfterImport } from "@/app/actions/backup";
import { toast } from "sonner";
import JSZip from "jszip";
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
import { createClient } from "@/lib/supabase/client";

export function DatabaseImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

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
      // Read and extract the ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(pendingFile);

      // Extract all CSV files
      const backupData: { [tableName: string]: string } = {};
      const photoFiles: { path: string; blob: Blob }[] = [];

      for (const [filename, file] of Object.entries(zipContent.files)) {
        if (!file.dir) {
          if (filename.startsWith("data/") && filename.endsWith(".csv")) {
            const tableName = filename.replace("data/", "").replace(".csv", "");
            const csvContent = await file.async("text");
            backupData[tableName] = csvContent;
          } else if (filename.startsWith("photos/") || filename.startsWith("photos\\")) {
            const photoPath = filename.replace(/^photos[/\\]/, "").replace(/\\/g, "/");
            const photoBlob = await file.async("blob");
            photoFiles.push({ path: photoPath, blob: photoBlob });
          }
        }
      }

      if (Object.keys(backupData).length === 0) {
        throw new Error("No CSV files found in backup");
      }

      // Import the database data (without photos)
      const result = await importDatabaseBackup(backupData);

      if (!result.success) {
        throw new Error("Import failed");
      }

      // Upload photo files to Supabase Storage (client-side)
      let uploadedPhotos = 0;
      let failedPhotos = 0;
      const photoErrors: string[] = [];
      
      if (photoFiles.length > 0) {
        toast.info(`Uploading ${photoFiles.length} photos...`);
        
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }
        
        // Build a map of old photo paths to new photo paths
        const pathMapping: { [oldPath: string]: string } = {};
        
        for (const { path, blob } of photoFiles) {
          try {
            // Parse the old path: oldUserId/miniatureId/filename.ext
            const pathParts = path.split("/");
            if (pathParts.length !== 3) {
              failedPhotos++;
              photoErrors.push(`${path}: Invalid path format`);
              continue;
            }
            
            const [oldUserId, miniatureId, filename] = pathParts;
            
            // Create new path with current user ID
            const newPath = `${user.id}/${miniatureId}/${filename}`;
            pathMapping[path] = newPath;
            
            const { error: uploadError } = await supabase.storage
              .from("miniature-photos")
              .upload(newPath, blob, {
                upsert: true,
                contentType: blob.type || "image/jpeg",
              });

            if (!uploadError) {
              uploadedPhotos++;
            } else {
              failedPhotos++;
              console.error(`Failed to upload photo: ${path} -> ${newPath}`, uploadError);
              photoErrors.push(`${path}: ${uploadError.message}`);
            }
          } catch (uploadError) {
            failedPhotos++;
            console.error(`Error uploading photo: ${path}`, uploadError);
            photoErrors.push(`${path}: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`);
          }
        }
        
        // Update miniature_photos.storage_path on the server so paths match uploaded files
        if (Object.keys(pathMapping).length > 0) {
          try {
            await updatePhotoPathsAfterImport(pathMapping);
          } catch (updateError) {
            console.error("Error updating photo paths in database:", updateError);
          }
        }
        
        // Log detailed errors if any failed
        if (failedPhotos > 0) {
          console.error("Photo upload errors:", photoErrors);
        }
      }

      const photoMessage = uploadedPhotos > 0 
        ? `, ${uploadedPhotos} photo${uploadedPhotos !== 1 ? "s" : ""} uploaded${failedPhotos > 0 ? `, ${failedPhotos} failed` : ""}`
        : "";
        
      if (failedPhotos > 0) {
        toast.warning(
          `Database imported with warnings: ${uploadedPhotos}/${photoFiles.length} photos uploaded successfully. Check console for details.`
        );
      } else {
        toast.success(
          `Database imported successfully! ${result.totalRows} rows restored across ${
            Object.keys(result.results).length
          } tables${photoMessage}`
        );
      }

      // Refresh the page to show updated data
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
