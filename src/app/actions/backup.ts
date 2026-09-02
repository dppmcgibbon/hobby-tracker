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
      let query = supabase.from(table).select("*");

      // Filter by user_id for user-specific tables
      const userTables = [
        "miniatures",
        "miniature_status",
        "miniature_photos",
        "collections",
        "painting_recipes",
        "user_paints",
        "tags",
        "shared_miniatures",
        "storage_boxes",
        "saved_filters",
      ];

      if (userTables.includes(table)) {
        query = query.eq("user_id", user.id);
      }

      if (table === "profiles") {
        query = query.eq("id", user.id);
      }

      // For junction tables, we need to filter by related records
      if (table === "miniature_tags" || table === "miniature_recipes" || table === "miniature_games") {
        // Fetch user's miniature IDs first
        const { data: userMiniatures } = await supabase
          .from("miniatures")
          .select("id")
          .eq("user_id", user.id);

        if (userMiniatures && userMiniatures.length > 0) {
          const miniatureIds = userMiniatures.map((m) => m.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < miniatureIds.length; i += batchSize) {
            const batch = miniatureIds.slice(i, i + batchSize);
            const { data: batchData, error: batchError } = await supabase
              .from(table)
              .select("*")
              .in("miniature_id", batch);
            
            if (batchError) {
              console.error(`Error fetching ${table} batch:`, batchError);
              throw new Error(`Failed to backup ${table}: ${batchError.message}`);
            }
            
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
        // Fetch user's collection IDs first
        const { data: userCollections } = await supabase
          .from("collections")
          .select("id")
          .eq("user_id", user.id);

        if (userCollections && userCollections.length > 0) {
          const collectionIds = userCollections.map((c) => c.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < collectionIds.length; i += batchSize) {
            const batch = collectionIds.slice(i, i + batchSize);
            const { data: batchData, error: batchError } = await supabase
              .from(table)
              .select("*")
              .in("collection_id", batch);
            
            if (batchError) {
              console.error(`Error fetching ${table} batch:`, batchError);
              throw new Error(`Failed to backup ${table}: ${batchError.message}`);
            }
            
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
        // Fetch user's recipe IDs first
        const { data: userRecipes } = await supabase
          .from("painting_recipes")
          .select("id")
          .eq("user_id", user.id);

        if (userRecipes && userRecipes.length > 0) {
          const recipeIds = userRecipes.map((r) => r.id);
          
          // Fetch in batches to avoid "URI too long" error
          const batchSize = 100;
          const allData: any[] = [];
          
          for (let i = 0; i < recipeIds.length; i += batchSize) {
            const batch = recipeIds.slice(i, i + batchSize);
            const { data: batchData, error: batchError } = await supabase
              .from(table)
              .select("*")
              .in("recipe_id", batch);
            
            if (batchError) {
              console.error(`Error fetching ${table} batch:`, batchError);
              throw new Error(`Failed to backup ${table}: ${batchError.message}`);
            }
            
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

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        throw new Error(`Failed to backup ${table}: ${error.message}`);
      }

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
      const { data: mgRows, error: mgErr } = await supabase
        .from("miniature_games")
        .select("miniature_id")
        .in("game_id", gameBatch);
      if (mgErr) throw new Error(`Failed to fetch miniature_games: ${mgErr.message}`);
      for (const row of mgRows ?? []) linkedMiniatureIds.add((row as { miniature_id: string }).miniature_id);
    }
  }

  const candidateIds = [...linkedMiniatureIds];
  const miniatureIds: string[] = [];
  if (candidateIds.length > 0) {
    for (let i = 0; i < candidateIds.length; i += BATCH) {
      const batch = candidateIds.slice(i, i + BATCH);
      const { data: owned, error: mErr } = await supabase
        .from("miniatures")
        .select("id")
        .eq("user_id", user.id)
        .in("id", batch);
      if (mErr) throw new Error(`Failed to fetch miniatures: ${mErr.message}`);
      for (const row of owned ?? []) miniatureIds.push((row as { id: string }).id);
    }
  }

  const photoPaths: { storage_path: string }[] = [];
  if (miniatureIds.length > 0) {
    for (let i = 0; i < miniatureIds.length; i += BATCH) {
      const batch = miniatureIds.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("miniature_photos")
        .select("storage_path")
        .eq("user_id", user.id)
        .in("miniature_id", batch);
      if (error) throw new Error(`Failed to fetch miniature_photos: ${error.message}`);
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

  const { data: photos } = await supabase
    .from("miniature_photos")
    .select("id, storage_path")
    .eq("user_id", user.id);

  if (!photos?.length) return { success: true, updated: 0 };

  let updated = 0;
  for (const photo of photos) {
    const stored = photo.storage_path ? normalizeStoragePath(photo.storage_path) : "";
    const newPath = normalizedMapping.get(stored);
    if (newPath) {
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
    for (const tableName of REFERENCE_DELETE_ORDER) {
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
        const { error } = await supabase.from(tableName).insert(batch);
        if (error) {
          console.error(`Error importing ${tableName}:`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }
        results[tableName] = (results[tableName] || 0) + batch.length;
      }
    }

    // User-owned tables: delete current user's rows, then insert backup rows with user_id replaced; all other columns (including id) copied.
    // Junction tables (miniature_tags, etc.) have no user_id — delete rows that reference this user's miniatures/collections/recipes.
    const { data: myMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
    const { data: myCollections } = await supabase.from("collections").select("id").eq("user_id", user.id);
    const { data: myRecipes } = await supabase.from("painting_recipes").select("id").eq("user_id", user.id);
    const miniatureIds = (myMiniatures ?? []).map((m) => m.id);
    const collectionIds = (myCollections ?? []).map((c) => c.id);
    const recipeIds = (myRecipes ?? []).map((r) => r.id);

    if (miniatureIds.length > 0) {
      for (const tableName of ["miniature_tags", "miniature_recipes", "miniature_games"]) {
        const { error } = await supabase.from(tableName).delete().in("miniature_id", miniatureIds);
        if (error) console.error(`Error deleting ${tableName}:`, error);
      }
    }
    if (collectionIds.length > 0) {
      const { error } = await supabase.from("collection_miniatures").delete().in("collection_id", collectionIds);
      if (error) console.error("Error deleting collection_miniatures:", error);
    }
    if (recipeIds.length > 0) {
      const { error } = await supabase.from("recipe_steps").delete().in("recipe_id", recipeIds);
      if (error) console.error("Error deleting recipe_steps:", error);
    }

    const USER_TABLES_WITH_USER_ID = [
      "shared_miniatures", "saved_filters", "user_paints", "collections", "painting_recipes",
      "miniature_photos", "miniature_status", "miniatures", "storage_boxes", "tags",
    ];
    for (const tableName of USER_TABLES_WITH_USER_ID) {
      const { error } = await supabase.from(tableName).delete().eq("user_id", user.id);
      if (error) console.error(`Error deleting user data from ${tableName}:`, error);
    }

    const USER_INSERT_ORDER = [
      "tags", "storage_boxes", "miniatures", "miniature_status", "miniature_photos",
      "painting_recipes", "recipe_steps", "collections", "collection_miniatures",
      "user_paints", "saved_filters", "miniature_tags", "miniature_recipes", "miniature_games", "shared_miniatures",
    ];

    const USER_TABLES_WITH_USER_ID_SET = new Set(USER_TABLES_WITH_USER_ID);
    for (const tableName of USER_INSERT_ORDER) {
      if (!backupData[tableName]) continue;
      const rows = parseCSV(backupData[tableName]);
      if (rows.length === 0) continue;
      let toInsert = USER_TABLES_WITH_USER_ID_SET.has(tableName)
        ? rows.map((row) => ({ ...row, user_id: user.id }))
        : rows;

      // Sanitize foreign keys before inserting to avoid constraint violations
      if (tableName === "miniatures") {
        const { data: dbBoxes } = await supabase.from("storage_boxes").select("id").eq("user_id", user.id);
        const validBoxIds = new Set((dbBoxes ?? []).map((b) => b.id));
        toInsert = toInsert.map((row) => ({
          ...row,
          storage_box_id: row.storage_box_id && validBoxIds.has(row.storage_box_id) ? row.storage_box_id : null,
        }));
      } else if (tableName === "miniature_status") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        const seen = new Set<string>();
        toInsert = toInsert.filter((row) => {
          if (!row.miniature_id || !validMiniatureIds.has(row.miniature_id)) {
            console.warn(`Skipping orphaned miniature_status for miniature_id: ${row.miniature_id}`);
            return false;
          }
          if (seen.has(row.miniature_id)) return false;
          seen.add(row.miniature_id);
          return true;
        });
      } else if (tableName === "miniature_photos") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        toInsert = toInsert.filter((row) => row.miniature_id && validMiniatureIds.has(row.miniature_id));
      } else if (tableName === "miniature_tags") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        const { data: dbTags } = await supabase.from("tags").select("id").eq("user_id", user.id);
        const validTagIds = new Set((dbTags ?? []).map((t) => t.id));
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.tag_id &&
            validTagIds.has(row.tag_id)
        );
      } else if (tableName === "miniature_recipes") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        const { data: dbRecipes } = await supabase.from("painting_recipes").select("id").eq("user_id", user.id);
        const validRecipeIds = new Set((dbRecipes ?? []).map((r) => r.id));
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.recipe_id &&
            validRecipeIds.has(row.recipe_id)
        );
      } else if (tableName === "miniature_games") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        toInsert = toInsert.filter((row) => row.miniature_id && validMiniatureIds.has(row.miniature_id));
      } else if (tableName === "recipe_steps") {
        const { data: dbRecipes } = await supabase.from("painting_recipes").select("id").eq("user_id", user.id);
        const validRecipeIds = new Set((dbRecipes ?? []).map((r) => r.id));
        toInsert = toInsert.filter((row) => row.recipe_id && validRecipeIds.has(row.recipe_id));
      } else if (tableName === "collection_miniatures") {
        const { data: dbMiniatures } = await supabase.from("miniatures").select("id").eq("user_id", user.id);
        const validMiniatureIds = new Set((dbMiniatures ?? []).map((m) => m.id));
        const { data: dbCollections } = await supabase.from("collections").select("id").eq("user_id", user.id);
        const validCollectionIds = new Set((dbCollections ?? []).map((c) => c.id));
        toInsert = toInsert.filter(
          (row) =>
            row.miniature_id &&
            validMiniatureIds.has(row.miniature_id) &&
            row.collection_id &&
            validCollectionIds.has(row.collection_id)
        );
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
