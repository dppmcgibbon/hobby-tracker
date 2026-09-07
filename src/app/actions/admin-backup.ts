"use server";

import { requireAuth } from "@/lib/auth/server";
import { getDatabaseTableStats } from "@/lib/backup/database-backup";
import { getMiniatureBackupParts, getGameBackupGroups } from "@/lib/backup/r2-backup";
import { importDatabaseTablesFromZipBuffer } from "@/lib/backup/database-import";

export interface AdminBackupDashboardStats {
  tables: Array<{ tableName: string; rowCount: number }>;
  totalDatabaseRows: number;
  totalTablesCount: number;
  miniatures: {
    totalCount: number;
    totalBytes: number;
    parts: Array<{
      partNumber: number;
      totalParts: number;
      itemCount: number;
      totalBytes: number;
    }>;
  };
  games: {
    totalCount: number;
    totalBytes: number;
    groups: Array<{
      gameName: string;
      gameKey: string;
      itemCount: number;
      totalBytes: number;
      pdfCount: number;
      imageCount: number;
    }>;
  };
}

export async function getAdminBackupStats(): Promise<AdminBackupDashboardStats> {
  await requireAuth();

  const [tableStats, miniatureStats, gameStats] = await Promise.all([
    getDatabaseTableStats(),
    getMiniatureBackupParts(),
    getGameBackupGroups(),
  ]);

  const totalDatabaseRows = tableStats.reduce((sum, t) => sum + t.rowCount, 0);

  return {
    tables: tableStats,
    totalDatabaseRows,
    totalTablesCount: tableStats.length,
    miniatures: {
      totalCount: miniatureStats.totalCount,
      totalBytes: miniatureStats.totalBytes,
      parts: miniatureStats.parts.map((p) => ({
        partNumber: p.partNumber,
        totalParts: p.totalParts,
        itemCount: p.itemCount,
        totalBytes: p.totalBytes,
      })),
    },
    games: {
      totalCount: gameStats.totalCount,
      totalBytes: gameStats.totalBytes,
      groups: gameStats.groups.map((g) => ({
        gameName: g.gameName,
        gameKey: g.gameKey,
        itemCount: g.itemCount,
        totalBytes: g.totalBytes,
        pdfCount: g.pdfCount,
        imageCount: g.imageCount,
      })),
    },
  };
}

export async function importDatabaseBackupAction(formData: FormData): Promise<{
  success: boolean;
  totalRows?: number;
  tableCounts?: Record<string, number>;
  error?: string;
}> {
  await requireAuth();

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No backup ZIP file provided." };
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return { success: false, error: "Invalid file format. Please upload a .zip file." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await importDatabaseTablesFromZipBuffer(arrayBuffer);
    return result;
  } catch (error) {
    console.error("Error in importDatabaseBackupAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to restore database tables.",
    };
  }
}
