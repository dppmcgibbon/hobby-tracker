import { createServiceRoleClient } from "@/lib/supabase/server";

export const BACKUP_TABLES = [
  "army_types",
  "base_shapes",
  "base_types",
  "bases",
  "boardgames",
  "collect_apps",
  "collect_config",
  "collection_miniatures",
  "collections",
  "editions",
  "expansions",
  "factions",
  "games",
  "magazines",
  "miniature_games",
  "miniature_photos",
  "miniature_recipes",
  "miniature_status",
  "miniature_statuses",
  "miniature_tags",
  "miniatures",
  "paint_equivalents",
  "painting_recipes",
  "paints",
  "profiles",
  "recipe_steps",
  "records",
  "saved_filters",
  "shared_miniatures",
  "storage_boxes",
  "stories",
  "tags",
  "universes",
  "user_paints",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

const TABLE_PRIMARY_KEYS: Record<string, string[]> = {
  miniature_games: ["miniature_id", "game_id"],
  miniature_tags: ["miniature_id", "tag_id"],
  collection_miniatures: ["collection_id", "miniature_id"],
  miniature_recipes: ["miniature_id", "recipe_id"],
};

/**
 * Converts an array of objects into RFC 4180 compliant CSV format.
 * Escapes quotes, handles commas, newlines, and serializes JSON objects/arrays.
 */
export function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";

  // Collect all unique keys across all records in case some rows have missing keys
  const headerSet = new Set<string>();
  for (const row of data) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row)) {
        headerSet.add(key);
      }
    }
  }

  const headers = Array.from(headerSet);
  if (headers.length === 0) return "";

  const csvHeaders = headers
    .map((h) =>
      h.includes(",") || h.includes('"') || h.includes("\n") ? `"${h.replace(/"/g, '""')}"` : h
    )
    .join(",");

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return "";
        const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (
          strVal.includes(",") ||
          strVal.includes("\n") ||
          strVal.includes("\r") ||
          strVal.includes('"')
        ) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\r\n");
}

/**
 * Fetches all rows of a table using pagination without row count limits.
 * Uses Service Role client to ensure RLS does not truncate or omit any records.
 */
export async function fetchAllTableRows(
  tableName: string,
  onProgress?: (fetchedCount: number, totalEstimated?: number) => void
): Promise<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient();
  const allRows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  const orderKeys = TABLE_PRIMARY_KEYS[tableName] || ["id"];

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    let query = supabase.from(tableName).select("*", { count: "exact" });
    for (const key of orderKeys) {
      query = query.order(key, { ascending: true });
    }

    const { data, error, count } = await query.range(start, end);

    if (error) {
      // If ordering by 'id' failed because column does not exist, retry without order
      if (error.message && error.message.includes("does not exist")) {
        const fallbackRes = await supabase.from(tableName).select("*").range(start, end);
        if (fallbackRes.error) {
          throw new Error(`Failed to fetch table ${tableName}: ${fallbackRes.error.message}`);
        }
        const fallbackData = fallbackRes.data || [];
        allRows.push(...fallbackData);
        hasMore = fallbackData.length === pageSize;
      } else {
        throw new Error(`Failed to fetch table ${tableName}: ${error.message}`);
      }
    } else {
      const rows = data || [];
      allRows.push(...rows);
      if (typeof count === "number") {
        hasMore = allRows.length < count;
      } else {
        hasMore = rows.length === pageSize;
      }
    }

    page++;
    if (onProgress) {
      onProgress(allRows.length);
    }
  }

  return allRows;
}

/**
 * Returns the exact row counts for all database tables.
 */
export async function getDatabaseTableStats(): Promise<
  Array<{ tableName: string; rowCount: number }>
> {
  const supabase = createServiceRoleClient();

  const results = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) {
          return { tableName: table, rowCount: 0 };
        }
        return { tableName: table, rowCount: count || 0 };
      } catch {
        return { tableName: table, rowCount: 0 };
      }
    })
  );

  return results;
}
