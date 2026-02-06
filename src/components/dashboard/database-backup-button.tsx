"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Download, Loader2 } from "lucide-react";
import { createDatabaseBackup } from "@/app/actions/backup";
import { toast } from "sonner";
import JSZip from "jszip";

export function DatabaseBackupButton() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await createDatabaseBackup();

      if (!result.success || !result.backups) {
        throw new Error("Backup failed");
      }

      // Create a ZIP file containing all CSV files
      const zip = new JSZip();

      // Add each table's CSV to the zip
      result.backups.forEach(({ tableName, csv, rowCount }) => {
        zip.file(`${tableName}.csv`, csv);
      });

      // Add a metadata file
      const metadata = {
        backupDate: result.timestamp,
        tables: result.backups.map(({ tableName, rowCount }) => ({
          table: tableName,
          rows: rowCount,
        })),
        totalTables: result.backups.length,
        totalRows: result.backups.reduce((sum, b) => sum + b.rowCount, 0),
      };

      zip.file("backup_metadata.json", JSON.stringify(metadata, null, 2));

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;

      // Format filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      link.download = `hobby-tracker-backup-${timestamp}.zip`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      toast.success(
        `Database backup complete! ${metadata.totalTables} tables backed up (${metadata.totalRows} total rows)`
      );
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to create database backup. Please try again.");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Button
      onClick={handleBackup}
      disabled={isBackingUp}
      variant="outline"
      className="gap-2"
    >
      {isBackingUp ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating Backup...
        </>
      ) : (
        <>
          <Database className="h-4 w-4" />
          Backup Database
        </>
      )}
    </Button>
  );
}
