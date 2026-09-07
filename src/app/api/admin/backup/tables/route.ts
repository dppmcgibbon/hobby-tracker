import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  BACKUP_TABLES,
  fetchAllTableRows,
  convertToCSV,
  BackupTableName,
} from "@/lib/backup/database-backup";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for full database dump

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const specificTable = searchParams.get("table");

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    // If a specific table was requested, return that CSV directly
    if (specificTable && BACKUP_TABLES.includes(specificTable as BackupTableName)) {
      const rows = await fetchAllTableRows(specificTable);
      const csv = convertToCSV(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${specificTable}-${timestamp}.csv"`,
        },
      });
    }

    // Otherwise, generate a full ZIP containing all 34 tables as CSVs
    const passThrough = new PassThrough();
    const archive = new ZipArchive({
      zlib: { level: 6 },
    });

    archive.pipe(passThrough);

    // Run export in async stream worker
    (async () => {
      try {
        const tableSummaries: { table: string; rows: number }[] = [];

        for (const tableName of BACKUP_TABLES) {
          const rows = await fetchAllTableRows(tableName);
          const csv = convertToCSV(rows);
          archive.append(csv, { name: `tables/${tableName}.csv` });
          tableSummaries.push({
            table: tableName,
            rows: rows.length,
          });
        }

        const manifest = {
          exportDate: now.toISOString(),
          totalTables: tableSummaries.length,
          totalRows: tableSummaries.reduce((sum, t) => sum + t.rows, 0),
          unlimited: true,
          tables: tableSummaries,
        };

        archive.append(JSON.stringify(manifest, null, 2), {
          name: "backup_manifest.json",
        });

        await archive.finalize();
      } catch (err) {
        console.error("Error generating table backup archive:", err);
        archive.destroy(err as Error);
      }
    })();

    const webStream = Readable.toWeb(passThrough) as ReadableStream;
    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="hobby-tracker-db-tables-backup-${timestamp}.zip"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in tables backup route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create database backup" },
      { status: 500 }
    );
  }
}
