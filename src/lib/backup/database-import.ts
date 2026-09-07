import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { BACKUP_TABLES, BackupTableName } from "@/lib/backup/database-backup";

/**
 * Parses RFC 4180 CSV string into array of object records.
 * Supports multi-line values, escaped quotes, and JSON serialization.
 */
export function parseCSV(csv: string): Record<string, unknown>[] {
  if (!csv || typeof csv !== "string") return [];
  // Strip BOM if present
  csv = csv.replace(/^\uFEFF/, "");
  if (csv.trim().length === 0) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((val) => val.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, "").trim());
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      const val = values[index];
      if (val === undefined || val === "" || val.toLowerCase() === "null") {
        row[header] = null;
      } else {
        // Try parsing JSON if it starts with [ or {
        if (
          (val.startsWith("{") && val.endsWith("}")) ||
          (val.startsWith("[") && val.endsWith("]"))
        ) {
          try {
            row[header] = JSON.parse(val);
            return;
          } catch {
            // Keep as string if not valid JSON
          }
        }
        row[header] = val;
      }
    });

    data.push(row);
  }

  return data;
}

/** Extract table name from ZIP entry path. Accepts tables/name.csv, data/name.csv or name.csv. */
function tableNameFromZipPath(filename: string): string | null {
  const normalized = filename.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized.endsWith(".csv")) return null;
  const base = normalized.split("/").pop();
  return base ? base.slice(0, -4).toLowerCase() : null;
}

// Child / referencing tables must be cleared first to respect foreign keys
const DELETE_ORDER: BackupTableName[] = [
  "miniature_tags",
  "miniature_recipes",
  "miniature_games",
  "collection_miniatures",
  "recipe_steps",
  "miniature_photos",
  "miniature_status",
  "shared_miniatures",
  "saved_filters",
  "user_paints",
  "collections",
  "painting_recipes",
  "miniatures",
  "storage_boxes",
  "tags",
  "paint_equivalents",
  "expansions",
  "editions",
  "games",
  "factions",
  "paints",
  "bases",
  "base_shapes",
  "base_types",
  "miniature_statuses",
  "army_types",
  "universes",
  "stories",
  "records",
  "magazines",
  "boardgames",
  "collect_config",
  "collect_apps",
];

// Parent tables must be inserted first so foreign keys resolve cleanly
const INSERT_ORDER: BackupTableName[] = [
  "universes",
  "army_types",
  "miniature_statuses",
  "base_shapes",
  "base_types",
  "bases",
  "factions",
  "paints",
  "paint_equivalents",
  "games",
  "editions",
  "expansions",
  "tags",
  "storage_boxes",
  "collect_apps",
  "collect_config",
  "boardgames",
  "magazines",
  "records",
  "stories",
  "miniatures",
  "miniature_status",
  "miniature_photos",
  "painting_recipes",
  "recipe_steps",
  "collections",
  "collection_miniatures",
  "user_paints",
  "saved_filters",
  "miniature_tags",
  "miniature_recipes",
  "miniature_games",
  "shared_miniatures",
  "profiles",
];

const COMPOSITE_KEY_MAP: Record<string, string> = {
  miniature_tags: "miniature_id,tag_id",
  miniature_recipes: "miniature_id,recipe_id",
  miniature_games: "miniature_id,game_id",
  collection_miniatures: "collection_id,miniature_id",
  paint_equivalents: "paint_id,equivalent_paint_id",
  miniature_status: "miniature_id",
};

export interface DatabaseImportResult {
  success: boolean;
  totalRows: number;
  tableCounts: Record<string, number>;
  error?: string;
}

/**
 * Imports all tables from a ZIP buffer.
 * Uses Service Role client to bypass RLS and restore complete data integrity.
 */
export async function importDatabaseTablesFromZipBuffer(
  arrayBuffer: ArrayBuffer
): Promise<DatabaseImportResult> {
  const supabase = createServiceRoleClient();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const backupData: Record<string, string> = {};

  for (const [filename, zipFile] of Object.entries(zip.files)) {
    if (zipFile.dir) continue;

    const tableName = tableNameFromZipPath(filename);
    if (tableName && BACKUP_TABLES.includes(tableName as BackupTableName)) {
      const csvContent = await zipFile.async("text");
      backupData[tableName] = csvContent;
    }
  }

  const tableNamesFound = Object.keys(backupData);
  if (tableNamesFound.length === 0) {
    throw new Error(
      "No valid database table CSV files found in the uploaded ZIP. Please ensure the ZIP contains files like miniatures.csv, factions.csv, etc."
    );
  }

  const BATCH = 100;
  const tableCounts: Record<string, number> = {};

  // Step 1: Wipe existing data for tables present in the backup (in reverse dependency order)
  for (const tableName of DELETE_ORDER) {
    if (!backupData[tableName] || backupData[tableName].trim().length === 0) continue;

    let query = supabase.from(tableName).delete();

    // In Supabase, delete() requires a filter unless neq dummy ID is used
    if (tableName === "paint_equivalents") {
      query = query.neq("paint_id", "00000000-0000-0000-0000-000000000000");
    } else if (
      tableName === "miniature_tags" ||
      tableName === "miniature_recipes" ||
      tableName === "miniature_games"
    ) {
      query = query.neq("miniature_id", "00000000-0000-0000-0000-000000000000");
    } else if (tableName === "collection_miniatures") {
      query = query.neq("collection_id", "00000000-0000-0000-0000-000000000000");
    } else if (
      ["collect_apps", "collect_config", "boardgames", "magazines", "records", "stories"].includes(
        tableName
      )
    ) {
      query = query.gte("id", 0);
    } else {
      query = query.neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { error } = await query;
    if (error && error.code !== "42P01") {
      console.warn(`Warning clearing ${tableName}:`, error.message);
    }
  }

  // Step 2: Insert table data in dependency order
  for (const tableName of INSERT_ORDER) {
    if (!backupData[tableName]) continue;

    const rows = parseCSV(backupData[tableName]);
    if (rows.length === 0) continue;

    // Strip legacy user_id columns if any exist in the backup CSV
    const sanitizedRows = rows.map((row) => {
      const copy = { ...row };
      delete copy.user_id;
      return copy;
    });

    const conflictTarget = COMPOSITE_KEY_MAP[tableName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableClient = (supabase as any).from(tableName);

    for (let i = 0; i < sanitizedRows.length; i += BATCH) {
      const batch = sanitizedRows.slice(i, i + BATCH);
      let error;

      if (conflictTarget) {
        const res = await tableClient.upsert(batch, { onConflict: conflictTarget });
        error = res.error;
      } else if (batch[0] && "id" in batch[0]) {
        const res = await tableClient.upsert(batch, { onConflict: "id" });
        error = res.error;
      } else {
        const res = await tableClient.insert(batch);
        error = res.error;
      }

      if (error) {
        console.error(`Error inserting into ${tableName}:`, error);
        throw new Error(`Failed to restore table ${tableName}: ${error.message}`);
      }

      tableCounts[tableName] = (tableCounts[tableName] || 0) + batch.length;
    }
  }

  // Step 3: Revalidate caches
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/admin", "layout");
  revalidatePath("/dashboard/admin/backup");

  const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);

  return {
    success: true,
    totalRows,
    tableCounts,
  };
}
