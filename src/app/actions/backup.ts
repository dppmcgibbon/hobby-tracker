"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { BACKUP_IMPORTS_BUCKET } from "@/lib/backup-imports";
import { uploadR2Object, downloadR2Object, deleteR2Object } from "@/lib/r2";

// Helper function to convert array of objects to CSV
function convertToCSV(data: any[], tableName: string): string {
  if (data.length === 0) return "";

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV header row
  const csvHeaders = headers.join(",");

  // Create CSV data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Handle null, undefined, and special characters
        if (value === null || value === undefined) return "";
        // Serialize objects/arrays (e.g. JSONB) so they round-trip
        const raw =
          typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        const stringValue = raw.replace(/"/g, '""');
        // Wrap in quotes if contains comma, newline, or quote
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

// Helper function to parse CSV back to array of objects with full RFC 4180 multi-line quote support
function parseCSV(csv: string): any[] {
  if (!csv || typeof csv !== "string") return [];
  // Strip BOM
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
          // Escaped quote ("") -> add single quote
          currentField += '"';
          i++;
        } else {
          // Closing quote
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
        if (nextChar === "\n") {
          i++; // Skip \n in \r\n
        }
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

  // Push last field and row if any
  currentRow.push(currentField.trim());
  if (currentRow.some((val) => val.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, "").trim());
  const data: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row: any = {};
    headers.forEach((header, index) => {
      const val = values[index];
      // Convert empty strings, "null", and "undefined" to null
      row[header] =
        val === undefined || val === "" || val.toLowerCase() === "null"
          ? null
          : val;
    });
    data.push(row);
  }

  return data;
}

const TABLES_COMPOSITE_KEYS: Record<string, string[]> = {
  miniature_tags: ["miniature_id", "tag_id"],
  miniature_recipes: ["miniature_id", "recipe_id"],
  miniature_games: ["miniature_id", "game_id"],
  collection_miniatures: ["collection_id", "miniature_id"],
  paint_equivalents: ["paint_id", "equivalent_paint_id"],
};

/** Fetch all rows for a Supabase query using pagination (bypasses PostgREST 1,000 row default limit) */
async function fetchAllRowsForQuery(query: any): Promise<any[]> {
  const allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const { data, error, count } = await query.range(start, end);

    if (error) {
      console.error("Error fetching paginated rows:", error);
      throw error;
    }

    if (data && data.length > 0) {
      allRows.push(...data);
      if (typeof count === "number") {
        hasMore = allRows.length < count;
      } else {
        hasMore = data.length === pageSize;
      }
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

export async function createDatabaseBackup() {
  const user = await requireAuth();
  const supabase = await createClient();

  try {
    // Define tables to backup (user-specific and reference data)
    const tables = [
      // User-specific tables
      "miniatures",
      "miniature_status",
      "miniature_photos",
      "miniature_tags",
      "miniature_recipes",
      "miniature_games",
      "collections",
      "collection_miniatures",
      "painting_recipes",
      "recipe_steps",
      "user_paints",
      "tags",
      "shared_miniatures",
      "storage_boxes",
      "saved_filters",
      // Reference tables (shared data)
      "universes",
      "factions",
      "army_types",
      "games",
      "editions",
      "expansions",
      "paints",
      "paint_equivalents",
      "bases",
      "base_shapes",
      "base_types",
      "miniature_statuses",
      // Profile (current user only)
      "profiles",
      // Collect-app tables (catalog data)
      "collect_apps",
      "collect_config",
      "boardgames",
      "magazines",
      "records",
      "stories",
    ];

    const backups: Array<{ tableName: string; csv: string; rowCount: number }> = [];

    // Fetch data for each table
    for (const table of tables) {
      let query = supabase.from(table).select("*", { count: "exact" });

      // For junction tables without user_id, fetch all parent records
      if (table === "miniature_tags" || table === "miniature_recipes" || table === "miniature_games") {
        // Fetch miniature IDs first (paginated to handle >1000 items)
        const userMiniatures = await fetchAllRowsForQuery(
          supabase
            .from("miniatures")
            .select("id", { count: "exact" })
            .order("id", { ascending: true })
        );

        if (userMiniatures && userMiniatures.length > 0) {
          const miniatureIds = userMiniatures.map((m) => m.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < miniatureIds.length; i += batchSize) {
            const batch = miniatureIds.slice(i, i + batchSize);
            let bQuery = supabase
              .from(table)
              .select("*", { count: "exact" })
              .in("miniature_id", batch);
            
            const compKeys = TABLES_COMPOSITE_KEYS[table];
            if (compKeys) {
              for (const k of compKeys) {
                bQuery = bQuery.order(k, { ascending: true });
              }
            }
            
            const batchData = await fetchAllRowsForQuery(bQuery);
            if (batchData) {
              allData.push(...batchData);
            }
          }
          
          const csv = allData.length > 0 ? convertToCSV(allData, table) : "";
          backups.push({ tableName: table, csv, rowCount: allData.length });
          continue;
        }
        backups.push({ tableName: table, csv: "", rowCount: 0 });
        continue;
      }

      if (table === "collection_miniatures") {
        // Fetch collection IDs first (paginated to handle >1000 items)
        const userCollections = await fetchAllRowsForQuery(
          supabase
            .from("collections")
            .select("id", { count: "exact" })
            .order("id", { ascending: true })
        );

        if (userCollections && userCollections.length > 0) {
          const collectionIds = userCollections.map((c) => c.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < collectionIds.length; i += batchSize) {
            const batch = collectionIds.slice(i, i + batchSize);
            const batchData = await fetchAllRowsForQuery(
              supabase
                .from(table)
                .select("*", { count: "exact" })
                .in("collection_id", batch)
                .order("collection_id", { ascending: true })
                .order("miniature_id", { ascending: true })
            );
            
            if (batchData) {
              allData.push(...batchData);
            }
          }
          
          const csv = allData.length > 0 ? convertToCSV(allData, table) : "";
          backups.push({ tableName: table, csv, rowCount: allData.length });
          continue;
        }
        backups.push({ tableName: table, csv: "", rowCount: 0 });
        continue;
      }

      if (table === "recipe_steps") {
        // Fetch recipe IDs first (paginated to handle >1000 items)
        const userRecipes = await fetchAllRowsForQuery(
          supabase
            .from("painting_recipes")
            .select("id", { count: "exact" })
            .order("id", { ascending: true })
        );

        if (userRecipes && userRecipes.length > 0) {
          const recipeIds = userRecipes.map((r) => r.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < recipeIds.length; i += batchSize) {
            const batch = recipeIds.slice(i, i + batchSize);
            const batchData = await fetchAllRowsForQuery(
              supabase
                .from(table)
                .select("*", { count: "exact" })
                .in("recipe_id", batch)
                .order("id", { ascending: true })
            );
            
            if (batchData) {
              allData.push(...batchData);
            }
          }
          
          const csv = allData.length > 0 ? convertToCSV(allData, table) : "";
          backups.push({ tableName: table, csv, rowCount: allData.length });
          continue;
        }
        backups.push({ tableName: table, csv: "", rowCount: 0 });
        continue;
      }

      // Apply deterministic ordering
      const compKeys = TABLES_COMPOSITE_KEYS[table];
      if (compKeys) {
        for (const k of compKeys) {
          query = query.order(k, { ascending: true });
        }
      } else {
        query = query.order("id", { ascending: true });
      }

      const data = await fetchAllRowsForQuery(query);

      const csv = data && data.length > 0 ? convertToCSV(data, table) : "";
      backups.push({
        tableName: table,
        csv,
        rowCount: data?.length ?? 0,
      });
    }

    return {
      success: true,
      backups,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database backup error:", error);
    throw error;
  }
}

/**
 * Miniature-photos from storage for the current user's models linked to games in the given universe
 * (at least one miniature_games row for a game with this universe_id). No CSV / database export.
 */
export async function createUniversePhotosBackup(universeId: string) {
  const user = await requireAuth();
  const supabase = await createClient();
  const BATCH = 100;

  if (!universeId || typeof universeId !== "string") {
    throw new Error("Universe is required");
  }

  const { data: universeRow, error: universeErr } = await supabase
    .from("universes")
    .select("id, name")
    .eq("id", universeId)
    .maybeSingle();

  if (universeErr || !universeRow) {
    throw new Error("Universe not found");
  }

  const { data: gamesInUniverse, error: gamesErr } = await supabase
    .from("games")
    .select("id")
    .eq("universe_id", universeId);

  if (gamesErr) {
    throw new Error(`Failed to fetch games: ${gamesErr.message}`);
  }

  const universeGameIds = [...new Set((gamesInUniverse ?? []).map((g: { id: string }) => g.id))];

  const linkedMiniatureIds = new Set<string>();
  if (universeGameIds.length > 0) {
    for (let i = 0; i < universeGameIds.length; i += BATCH) {
      const gameBatch = universeGameIds.slice(i, i + BATCH);
      const mgRows = await fetchAllRowsForQuery(
        supabase
          .from("miniature_games")
          .select("miniature_id", { count: "exact" })
          .in("game_id", gameBatch)
          .order("miniature_id", { ascending: true })
      );
      for (const row of mgRows ?? []) linkedMiniatureIds.add((row as { miniature_id: string }).miniature_id);
    }
  }

  const candidateIds = [...linkedMiniatureIds];
  const miniatureIds: string[] = [];
  if (candidateIds.length > 0) {
    for (let i = 0; i < candidateIds.length; i += BATCH) {
      const batch = candidateIds.slice(i, i + BATCH);
      const owned = await fetchAllRowsForQuery(
        supabase
          .from("miniatures")
          .select("id", { count: "exact" })
          .in("id", batch)
          .order("id", { ascending: true })
      );
      for (const row of owned ?? []) miniatureIds.push((row as { id: string }).id);
    }
  }

  const photoPaths: { storage_path: string }[] = [];
  if (miniatureIds.length > 0) {
    for (let i = 0; i < miniatureIds.length; i += BATCH) {
      const batch = miniatureIds.slice(i, i + BATCH);
      const data = await fetchAllRowsForQuery(
        supabase
          .from("miniature_photos")
          .select("storage_path", { count: "exact" })
          .in("miniature_id", batch)
          .order("id", { ascending: true })
      );
      if (data) photoPaths.push(...(data as { storage_path: string }[]));
    }
  }

  const photoFiles: Array<{ path: string; blob: Blob }> = [];
  const photosWithPath = photoPaths.filter((p) => p.storage_path);
  const PHOTO_BATCH_SIZE = 10;
  for (let i = 0; i < photosWithPath.length; i += PHOTO_BATCH_SIZE) {
    const batch = photosWithPath.slice(i, i + PHOTO_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (photo) => {
        try {
          const buffer = await downloadR2Object(photo.storage_path);
          const blob = new Blob([new Uint8Array(buffer)]);
          return { path: photo.storage_path, blob };
        } catch (downloadError) {
          console.warn(`Failed to download photo: ${photo.storage_path}`, downloadError);
        }
        return null;
      })
    );
    for (const r of results) {
      if (r) photoFiles.push(r);
    }
  }

  return {
    success: true,
    photoFiles,
    timestamp: new Date().toISOString(),
    universeId: universeRow.id as string,
    universeName: universeRow.name as string,
    miniatureCount: miniatureIds.length,
    universeGameCount: universeGameIds.length,
    photoRowCount: photosWithPath.length,
  };
}

/** Normalize storage path for consistent matching (ZIP paths may use \\ or extra slashes). */
function normalizeStoragePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").trim();
}

/** Server action: update miniature_photos.storage_path after import using path mapping. */
export async function updatePhotoPathsAfterImport(pathMapping: Record<string, string>) {
  const user = await requireAuth();
  const supabase = await createClient();

  const normalizedMapping = new Map<string, string>();
  for (const [oldPath, newPath] of Object.entries(pathMapping)) {
    if (oldPath && newPath) {
      normalizedMapping.set(normalizeStoragePath(oldPath), normalizeStoragePath(newPath));
    }
  }
  if (normalizedMapping.size === 0) return { success: true, updated: 0 };

  const photos = await fetchAllRowsForQuery(
    supabase
      .from("miniature_photos")
      .select("id, storage_path", { count: "exact" })
      .order("id", { ascending: true })
  );

  if (!photos?.length) return { success: true, updated: 0 };

  let updated = 0;
  for (const photo of photos) {
    const stored = photo.storage_path ? normalizeStoragePath(photo.storage_path) : "";
    const newPath = normalizedMapping.get(stored);
    if (newPath && newPath !== stored) {
      const { error } = await supabase
        .from("miniature_photos")
        .update({ storage_path: newPath })
        .eq("id", photo.id);
      if (!error) updated++;
    }
  }
  return { success: true, updated };
}

export async function importDatabaseBackup(
  backupData: { [tableName: string]: string },
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const user = await requireAuth();

  try {
    const results: { [table: string]: number } = {};
    const BATCH = 100;

    // Reference tables: no user_id — wipe and fully replace with backup (IDs preserved).
    const REFERENCE_DELETE_ORDER = [
      "paint_equivalents", "expansions", "editions", "games",
      "factions", "paints", "bases", "base_shapes", "base_types",
      "miniature_statuses", "army_types", "universes",
      "stories", "records", "magazines", "boardgames", "collect_config", "collect_apps",
    ];
    const REFERENCE_INSERT_ORDER = [
      "universes", "army_types", "miniature_statuses", "games", "editions", "expansions",
      "factions", "paints", "bases", "base_shapes", "base_types", "paint_equivalents",
      "collect_apps", "collect_config", "boardgames", "magazines", "records", "stories",
    ];

    const REFERENCE_TABLES_INT_ID = ["collect_apps", "collect_config", "boardgames", "magazines", "records", "stories"];
    const NULL_UUID = "00000000-0000-0000-0000-000000000000";

    // Only wipe reference tables that are present in the backup data
    for (const tableName of REFERENCE_DELETE_ORDER) {
      if (!backupData[tableName] || backupData[tableName].trim().length === 0) continue;
      let q = supabase.from(tableName).delete();
      if (tableName === "paint_equivalents") {
        q = q.neq("paint_id", NULL_UUID);
      } else if (REFERENCE_TABLES_INT_ID.includes(tableName)) {
        q = q.gte("id", 0);
      } else {
        q = q.neq("id", NULL_UUID);
      }
      const { error } = await q;
      if (error && error.code !== "42P01") console.error(`Error wiping ${tableName}:`, error);
    }

    for (const tableName of REFERENCE_INSERT_ORDER) {
      if (!backupData[tableName]) continue;
      const rows = parseCSV(backupData[tableName]);
      if (rows.length === 0) continue;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        let error;
        if (tableName === "paint_equivalents") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "paint_id,equivalent_paint_id" });
          error = res.error;
        } else if (batch[0] && "id" in batch[0]) {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "id" });
          error = res.error;
        } else {
          const res = await supabase.from(tableName).insert(batch);
          error = res.error;
        }
        if (error) {
          console.error(`Error importing ${tableName}:`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }
        results[tableName] = (results[tableName] || 0) + batch.length;
      }
    }

    // User-owned tables: delete existing rows.
    // Fetch miniature, collection, and recipe IDs (paginated) to delete junction records in safe URL batches.
    const myMiniatures = await fetchAllRowsForQuery(
      supabase.from("miniatures").select("id", { count: "exact" }).order("id", { ascending: true })
    );
    const myCollections = await fetchAllRowsForQuery(
      supabase.from("collections").select("id", { count: "exact" }).order("id", { ascending: true })
    );
    const myRecipes = await fetchAllRowsForQuery(
      supabase.from("painting_recipes").select("id", { count: "exact" }).order("id", { ascending: true })
    );

    const miniatureIds = myMiniatures.map((m) => m.id);
    const collectionIds = myCollections.map((c) => c.id);
    const recipeIds = myRecipes.map((r) => r.id);

    if (miniatureIds.length > 0) {
      for (let i = 0; i < miniatureIds.length; i += BATCH) {
        const batch = miniatureIds.slice(i, i + BATCH);
        for (const tableName of ["miniature_tags", "miniature_recipes", "miniature_games"]) {
          const { error } = await supabase.from(tableName).delete().in("miniature_id", batch);
          if (error) console.error(`Error deleting ${tableName} batch:`, error);
        }
      }
    }
    if (collectionIds.length > 0) {
      for (let i = 0; i < collectionIds.length; i += BATCH) {
        const batch = collectionIds.slice(i, i + BATCH);
        const { error } = await supabase.from("collection_miniatures").delete().in("collection_id", batch);
        if (error) console.error("Error deleting collection_miniatures batch:", error);
      }
    }
    if (recipeIds.length > 0) {
      for (let i = 0; i < recipeIds.length; i += BATCH) {
        const batch = recipeIds.slice(i, i + BATCH);
        const { error } = await supabase.from("recipe_steps").delete().in("recipe_id", batch);
        if (error) console.error("Error deleting recipe_steps batch:", error);
      }
    }

    const DATA_TABLES_TO_CLEAR = [
      "shared_miniatures", "saved_filters", "user_paints", "collections", "painting_recipes",
      "miniature_photos", "miniature_status", "miniatures", "storage_boxes", "tags",
    ];
    for (const tableName of DATA_TABLES_TO_CLEAR) {
      const { error } = await supabase.from(tableName).delete().not("id", "is", null);
      if (error) console.error(`Error deleting data from ${tableName}:`, error);
    }

    const USER_INSERT_ORDER = [
      "tags", "storage_boxes", "miniatures", "miniature_status", "miniature_photos",
      "painting_recipes", "recipe_steps", "collections", "collection_miniatures",
      "user_paints", "saved_filters", "miniature_tags", "miniature_recipes", "miniature_games", "shared_miniatures",
    ];

    // Cache valid reference table IDs for relational sanitization without row limits
    const validFactions = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("factions").select("id", { count: "exact" }).order("id", { ascending: true }))).map((f: any) => f.id)
    );
    const validGames = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("games").select("id", { count: "exact" }).order("id", { ascending: true }))).map((g: any) => g.id)
    );
    const validEditions = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("editions").select("id", { count: "exact" }).order("id", { ascending: true }))).map((e: any) => e.id)
    );
    const validExpansions = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("expansions").select("id", { count: "exact" }).order("id", { ascending: true }))).map((e: any) => e.id)
    );
    const validBases = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("bases").select("id", { count: "exact" }).order("id", { ascending: true }))).map((b: any) => b.id)
    );
    const validBaseShapes = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("base_shapes").select("id", { count: "exact" }).order("id", { ascending: true }))).map((b: any) => b.id)
    );
    const validBaseTypes = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("base_types").select("id", { count: "exact" }).order("id", { ascending: true }))).map((b: any) => b.id)
    );
    const validStatuses = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("miniature_statuses").select("id", { count: "exact" }).order("id", { ascending: true }))).map((s: any) => s.id)
    );
    const validPaints = new Set<string>(
      (await fetchAllRowsForQuery(supabase.from("paints").select("id", { count: "exact" }).order("id", { ascending: true }))).map((p: any) => p.id)
    );

    // Track user record IDs without hitting 1,000 row limits
    const validBoxIds = new Set<string>();
    const validTagIds = new Set<string>();
    const validMiniatureIds = new Set<string>();
    const validRecipeIds = new Set<string>();
    const validCollectionIds = new Set<string>();

    for (const tableName of USER_INSERT_ORDER) {
      if (!backupData[tableName]) continue;
      const rows = parseCSV(backupData[tableName]);
      if (rows.length === 0) continue;
      // Strip any legacy user_id column from backup CSVs before inserting
      let toInsert = rows.map((row) => {
        const { user_id, ...rest } = row;
        return rest;
      });

      // Sanitize foreign keys before inserting to avoid constraint violations and track IDs
      if (tableName === "tags") {
        for (const r of toInsert) if (r.id) validTagIds.add(r.id);
      } else if (tableName === "storage_boxes") {
        for (const r of toInsert) if (r.id) validBoxIds.add(r.id);
      } else if (tableName === "miniatures") {
        toInsert = toInsert.map((row) => ({
          ...row,
          storage_box_id: row.storage_box_id && validBoxIds.has(row.storage_box_id) ? row.storage_box_id : null,
          faction_id: row.faction_id && validFactions.has(row.faction_id) ? row.faction_id : null,
          base_id: row.base_id && validBases.has(row.base_id) ? row.base_id : null,
          base_shape_id: row.base_shape_id && validBaseShapes.has(row.base_shape_id) ? row.base_shape_id : null,
          base_type_id: row.base_type_id && validBaseTypes.has(row.base_type_id) ? row.base_type_id : null,
        }));
        for (const r of toInsert) if (r.id) validMiniatureIds.add(r.id);
      } else if (tableName === "miniature_status") {
        const seen = new Set<string>();
        toInsert = toInsert.filter((row) => {
          if (!row.miniature_id || !validMiniatureIds.has(row.miniature_id)) {
            console.warn(`Skipping orphaned miniature_status for miniature_id: ${row.miniature_id}`);
            return false;
          }
          if (seen.has(row.miniature_id)) return false;
          seen.add(row.miniature_id);
          return true;
        }).map((row) => ({
          ...row,
          status_id: row.status_id && validStatuses.has(row.status_id) ? row.status_id : null,
        }));
      } else if (tableName === "miniature_photos") {
        toInsert = toInsert.filter((row) => row.miniature_id && validMiniatureIds.has(row.miniature_id));
      } else if (tableName === "painting_recipes") {
        toInsert = toInsert.map((row) => ({
          ...row,
          faction_id: row.faction_id && validFactions.has(row.faction_id) ? row.faction_id : null,
        }));
        for (const r of toInsert) if (r.id) validRecipeIds.add(r.id);
      } else if (tableName === "recipe_steps") {
        toInsert = toInsert.filter((row) => row.recipe_id && validRecipeIds.has(row.recipe_id)).map((row) => ({
          ...row,
          paint_id: row.paint_id && validPaints.has(row.paint_id) ? row.paint_id : null,
        }));
      } else if (tableName === "collections") {
        for (const r of toInsert) if (r.id) validCollectionIds.add(r.id);
      } else if (tableName === "collection_miniatures") {
        const seen = new Set<string>();
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.collection_id &&
            validCollectionIds.has(row.collection_id) &&
            !seen.has(`${row.collection_id}:${row.miniature_id}`) &&
            seen.add(`${row.collection_id}:${row.miniature_id}`)
        );
      } else if (tableName === "user_paints") {
        toInsert = toInsert.filter((row) => row.paint_id && validPaints.has(row.paint_id));
      } else if (tableName === "miniature_tags") {
        const seen = new Set<string>();
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.tag_id &&
            validTagIds.has(row.tag_id) &&
            !seen.has(`${row.miniature_id}:${row.tag_id}`) &&
            seen.add(`${row.miniature_id}:${row.tag_id}`)
        );
      } else if (tableName === "miniature_recipes") {
        const seen = new Set<string>();
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.recipe_id &&
            validRecipeIds.has(row.recipe_id) &&
            !seen.has(`${row.miniature_id}:${row.recipe_id}`) &&
            seen.add(`${row.miniature_id}:${row.recipe_id}`)
        );
      } else if (tableName === "miniature_games") {
        const seen = new Set<string>();
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.game_id &&
            validGames.has(row.game_id) &&
            !seen.has(`${row.miniature_id}:${row.game_id}`) &&
            seen.add(`${row.miniature_id}:${row.game_id}`)
        ).map((row) => ({
          ...row,
          edition_id: row.edition_id && validEditions.has(row.edition_id) ? row.edition_id : null,
          expansion_id: row.expansion_id && validExpansions.has(row.expansion_id) ? row.expansion_id : null,
        }));
      } else if (tableName === "shared_miniatures") {
        toInsert = toInsert.filter((row) => row.miniature_id && validMiniatureIds.has(row.miniature_id));
      }

      if (toInsert.length === 0) continue;

      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        let error;
        if (tableName === "miniature_status") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "miniature_id" });
          error = res.error;
        } else if (tableName === "miniature_tags") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "miniature_id,tag_id" });
          error = res.error;
        } else if (tableName === "miniature_recipes") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "miniature_id,recipe_id" });
          error = res.error;
        } else if (tableName === "miniature_games") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "miniature_id,game_id" });
          error = res.error;
        } else if (tableName === "collection_miniatures") {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "collection_id,miniature_id" });
          error = res.error;
        } else if (batch[0] && "id" in batch[0]) {
          const res = await supabase.from(tableName).upsert(batch, { onConflict: "id" });
          error = res.error;
        } else {
          const res = await supabase.from(tableName).insert(batch);
          error = res.error;
        }

        if (error) {
          console.error(`Error importing ${tableName}:`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }
        results[tableName] = (results[tableName] || 0) + batch.length;
      }
    }

    // Update current user's profile from backup (display_name, avatar_url)
    if (backupData.profiles) {
      const backupProfiles = parseCSV(backupData.profiles);
      const myProfile = backupProfiles.find((p) => p.id === user.id);
      if (myProfile && (myProfile.display_name != null || myProfile.avatar_url != null)) {
        await supabase
          .from("profiles")
          .update({
            display_name: myProfile.display_name ?? undefined,
            avatar_url: myProfile.avatar_url ?? undefined,
          })
          .eq("id", user.id);
      }
    }

    revalidatePath("/dashboard", "layout");

    return {
      success: true,
      results,
      totalRows: Object.values(results).reduce((sum, count) => sum + count, 0),
    };
  } catch (error) {
    console.error("Database import error:", error);
    throw error;
  }
}

/** Extract table name from ZIP entry path. Accepts data/table.csv or any path ending in .csv. */
function tableNameFromZipPath(filename: string): string | null {
  const normalized = filename.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized.endsWith(".csv")) return null;
  const base = normalized.split("/").pop();
  return base ? base.slice(0, -4) : null;
}

/** Extract photo path from ZIP entry (photos/ prefix removed). */
function photoPathFromZipPath(filename: string): string | null {
  const normalized = filename.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("photos/")) {
    return normalized.slice(7).replace(/\\/g, "/");
  }
  return null;
}

const IMPORT_RESULT_FAIL = {
  success: false as const,
  uploadedPhotos: 0,
  failedPhotos: 0,
  photoErrors: [] as string[],
};

type ImportFromZipResult = {
  success: boolean;
  results?: { [table: string]: number };
  totalRows?: number;
  uploadedPhotos: number;
  failedPhotos: number;
  photoErrors: string[];
  error?: string;
};

/** Parse ZIP buffer and run import + photo uploads. Shared by file and storage-path flows. */
async function importFromZipBuffer(
  arrayBuffer: ArrayBuffer,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ImportFromZipResult> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const backupData: { [tableName: string]: string } = {};
  const photoEntries: { path: string; buffer: ArrayBuffer }[] = [];

  for (const [filename, zipFile] of Object.entries(zip.files)) {
    if (zipFile.dir) continue;

    const tableName = tableNameFromZipPath(filename);
    if (tableName) {
      const csvContent = await zipFile.async("text");
      backupData[tableName] = csvContent;
      continue;
    }

    const photoPath = photoPathFromZipPath(filename);
    if (photoPath) {
      const buffer = await zipFile.async("arraybuffer");
      photoEntries.push({ path: photoPath, buffer });
    }
  }

  // Fallback: ensure junction/photo tables are found (some ZIP tools use different path formats)
  const criticalTables = [
    "miniature_photos", "miniature_status", "miniature_tags", "miniature_games",
    "miniature_recipes", "collection_miniatures",
  ];
  for (const name of criticalTables) {
    if (backupData[name]) continue;
    const suffix = `${name}.csv`;
    for (const [filename, zipFile] of Object.entries(zip.files)) {
      if (zipFile.dir) continue;
      const norm = filename.replace(/\\/g, "/").toLowerCase();
      if (norm.endsWith("/" + suffix) || norm === suffix) {
        backupData[name] = await zipFile.async("text");
        break;
      }
    }
  }

  if (Object.keys(backupData).length === 0) {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["No CSV files found in backup"] };
  }

  const result = await importDatabaseBackup(backupData, supabase);
  if (!result.success) {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["Import failed"] };
  }

  const pathMapping: Record<string, string> = {};
  let uploadedPhotos = 0;
  const photoErrors: string[] = [];

  for (const { path, buffer } of photoEntries) {
    const pathParts = path.split("/");
    if (pathParts.length !== 3) {
      photoErrors.push(`${path}: Invalid path format`);
      continue;
    }
    const [, miniatureId, filename] = pathParts;
    const newPath = `${userId}/${miniatureId}/${filename}`;
    pathMapping[path] = newPath;

    try {
      await uploadR2Object(newPath, Buffer.from(buffer), "image/jpeg");
      uploadedPhotos++;
    } catch (uploadError) {
      const msg = uploadError instanceof Error ? uploadError.message : "R2 upload failed";
      photoErrors.push(`${path}: ${msg}`);
    }
  }

  if (Object.keys(pathMapping).length > 0) {
    await updatePhotoPathsAfterImport(pathMapping);
  }

  return {
    success: true,
    results: result.results,
    totalRows: result.totalRows,
    uploadedPhotos,
    failedPhotos: photoEntries.length - uploadedPhotos,
    photoErrors,
  };
}

export type ImportPhotosOnlyResult = {
  success: boolean;
  uploadedPhotos: number;
  failedPhotos: number;
  photoErrors: string[];
  error?: string;
};

/**
 * Parse a backup ZIP and upload only the photos to storage. No database rows are imported or changed.
 * ZIP must be from the app export (contains a photos/ folder with paths like photos/userId/miniatureId/filename).
 */
export async function importPhotosOnlyFromStoragePath(storagePath: string): Promise<ImportPhotosOnlyResult> {
  const user = await requireAuth();
  const supabase = createServiceRoleClient();

  if (!storagePath || typeof storagePath !== "string") {
    return { success: false, uploadedPhotos: 0, failedPhotos: 0, photoErrors: ["No storage path provided"] };
  }

  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.startsWith(`${user.id}/`)) {
    return { success: false, uploadedPhotos: 0, failedPhotos: 0, photoErrors: ["Invalid path: must be under your user folder"] };
  }

  try {
    let arrayBuffer: ArrayBuffer;
    try {
      const buffer = await downloadR2Object(normalized);
      arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    } catch (downloadError) {
      return {
        success: false,
        uploadedPhotos: 0,
        failedPhotos: 0,
        photoErrors: [downloadError instanceof Error ? downloadError.message : "Failed to download backup from storage"],
        error: "Failed to download backup",
      };
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const photoEntries: { path: string; buffer: ArrayBuffer }[] = [];

    for (const [filename, zipFile] of Object.entries(zip.files)) {
      if (zipFile.dir) continue;
      const photoPath = photoPathFromZipPath(filename);
      if (photoPath) {
        const buffer = await zipFile.async("arraybuffer");
        photoEntries.push({ path: photoPath, buffer });
      }
    }

    try {
      await deleteR2Object(normalized);
    } catch {}

    if (photoEntries.length === 0) {
      return { success: true, uploadedPhotos: 0, failedPhotos: 0, photoErrors: ["No photos found in ZIP (expected photos/ folder from app export)"] };
    }

    let uploadedPhotos = 0;
    const photoErrors: string[] = [];

    for (const { path, buffer } of photoEntries) {
      const pathParts = path.split("/");
      if (pathParts.length !== 3) {
        photoErrors.push(`${path}: Invalid path format`);
        continue;
      }
      const [, miniatureId, filename] = pathParts;
      const storagePathForUpload = `${user.id}/${miniatureId}/${filename}`;
      const ext = filename.split(".").pop()?.toLowerCase();
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      try {
        await uploadR2Object(storagePathForUpload, Buffer.from(buffer), contentType);
        uploadedPhotos++;
      } catch (uploadError) {
        const msg = uploadError instanceof Error ? uploadError.message : "Upload failed";
        photoErrors.push(`${path}: ${msg}`);
      }
    }

    return {
      success: true,
      uploadedPhotos,
      failedPhotos: photoEntries.length - uploadedPhotos,
      photoErrors,
    };
  } catch (error) {
    console.error("Import photos only error:", error);
    return {
      success: false,
      uploadedPhotos: 0,
      failedPhotos: 0,
      photoErrors: [error instanceof Error ? error.message : "Unknown error"],
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Import a database backup from a ZIP file (server-side).
 * Parses the ZIP on the server to avoid payload size limits that drop tables.
 */
export async function importDatabaseBackupFromFile(formData: FormData): Promise<ImportFromZipResult> {
  try {
    const user = await requireAuth();
    const supabase = createServiceRoleClient();

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ...IMPORT_RESULT_FAIL, error: "No file provided", photoErrors: ["No file provided"] };
    }

    const arrayBuffer = await file.arrayBuffer();
    return await importFromZipBuffer(arrayBuffer, user.id, supabase);
  } catch (error) {
    console.error("Import from file error:", error);
    return {
      ...IMPORT_RESULT_FAIL,
      photoErrors: [error instanceof Error ? error.message : "Unknown error"],
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Import from a ZIP already uploaded to Supabase Storage.
 * Use this when the client uploads the file to storage first so the server action request stays small.
 */
export async function importDatabaseBackupFromStoragePath(storagePath: string): Promise<ImportFromZipResult> {
  try {
    const user = await requireAuth();
    const supabase = createServiceRoleClient();

    if (!storagePath || typeof storagePath !== "string") {
      return { ...IMPORT_RESULT_FAIL, error: "No storage path provided", photoErrors: ["No storage path provided"] };
    }

    const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized.startsWith(`${user.id}/`)) {
      return { ...IMPORT_RESULT_FAIL, error: "Invalid path: must be under your user folder", photoErrors: ["Invalid path: must be under your user folder"] };
    }

    let arrayBuffer: ArrayBuffer;
    try {
      const buffer = await downloadR2Object(normalized);
      arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    } catch (downloadError) {
      console.error("Backup download error:", downloadError);
      return {
        ...IMPORT_RESULT_FAIL,
        photoErrors: [downloadError instanceof Error ? downloadError.message : "Failed to download backup from storage"],
        error: "Failed to download backup",
      };
    }

    const result = await importFromZipBuffer(arrayBuffer, user.id, supabase);

    try {
      await deleteR2Object(normalized);
    } catch {}

    return result;
  } catch (error) {
    console.error("Import from storage path error:", error);
    return {
      ...IMPORT_RESULT_FAIL,
      photoErrors: [error instanceof Error ? error.message : "Unknown error"],
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}
