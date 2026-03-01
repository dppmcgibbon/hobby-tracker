"use server";

import JSZip from "jszip";
import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { BACKUP_IMPORTS_BUCKET } from "@/lib/backup-imports";

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

// Helper function to parse CSV back to array of objects
function parseCSV(csv: string): any[] {
  if (!csv || typeof csv !== "string") return [];
  // Strip BOM and normalize line endings so split("\n") works
  csv = csv.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (csv.trim().length === 0) return [];

  const lines = csv.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/\uFEFF/g, ""));
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let currentValue = "";
    let insideQuotes = false;

    // Parse CSV line handling quoted values
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        if (insideQuotes && lines[i][j + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          j++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    // Create object from values
    const row: any = {};
    headers.forEach((header, index) => {
      const value = values[index] || "";
      // Convert empty strings to null
      row[header] = value === "" ? null : value;
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
    const photoFiles: Array<{ path: string; blob: Blob }> = [];

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

      if (table === "miniature_photos" && data && data.length > 0) {
        const photosWithPath = data.filter((p: { storage_path?: string }) => p.storage_path) as Array<{
          storage_path: string;
        }>;
        const PHOTO_BATCH_SIZE = 10;
        for (let i = 0; i < photosWithPath.length; i += PHOTO_BATCH_SIZE) {
          const batch = photosWithPath.slice(i, i + PHOTO_BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (photo) => {
              try {
                const { data: fileData, error: downloadError } = await supabase.storage
                  .from("miniature-photos")
                  .download(photo.storage_path);
                if (!downloadError && fileData) {
                  return { path: photo.storage_path, blob: fileData };
                }
                if (downloadError) {
                  console.warn(`Failed to download photo: ${photo.storage_path}`, downloadError);
                }
              } catch (downloadError) {
                console.warn(`Error downloading photo: ${photo.storage_path}`, downloadError);
              }
              return null;
            })
          );
          for (const r of results) {
            if (r) photoFiles.push(r);
          }
        }
      }
    }

    return {
      success: true,
      backups,
      photoFiles,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database backup error:", error);
    throw error;
  }
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
      const toInsert = USER_TABLES_WITH_USER_ID_SET.has(tableName)
        ? rows.map((row) => ({ ...row, user_id: user.id }))
        : rows;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await supabase.from(tableName).insert(batch);
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

    const { error: uploadError } = await supabase.storage
      .from("miniature-photos")
      .upload(newPath, buffer, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      photoErrors.push(`${path}: ${uploadError.message}`);
    } else {
      uploadedPhotos++;
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
    const { data, error: downloadError } = await supabase.storage
      .from(BACKUP_IMPORTS_BUCKET)
      .download(normalized);

    if (downloadError || !data) {
      return {
        success: false,
        uploadedPhotos: 0,
        failedPhotos: 0,
        photoErrors: [downloadError?.message ?? "Failed to download backup from storage"],
        error: "Failed to download backup",
      };
    }

    const arrayBuffer = await data.arrayBuffer();
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

    await supabase.storage.from(BACKUP_IMPORTS_BUCKET).remove([normalized]);

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

      const { error: uploadError } = await supabase.storage
        .from("miniature-photos")
        .upload(storagePathForUpload, buffer, { upsert: true, contentType });

      if (uploadError) {
        photoErrors.push(`${path}: ${uploadError.message}`);
      } else {
        uploadedPhotos++;
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
  const user = await requireAuth();
  const supabase = createServiceRoleClient();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["No file provided"] };
  }

  try {
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
  const user = await requireAuth();
  const supabase = createServiceRoleClient();

  if (!storagePath || typeof storagePath !== "string") {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["No storage path provided"] };
  }

  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.startsWith(`${user.id}/`)) {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["Invalid path: must be under your user folder"] };
  }

  try {
    const { data, error: downloadError } = await supabase.storage
      .from(BACKUP_IMPORTS_BUCKET)
      .download(normalized);

    if (downloadError || !data) {
      console.error("Backup download error:", downloadError);
      return {
        ...IMPORT_RESULT_FAIL,
        photoErrors: [downloadError?.message ?? "Failed to download backup from storage"],
        error: "Failed to download backup",
      };
    }

    const arrayBuffer = await data.arrayBuffer();
    const result = await importFromZipBuffer(arrayBuffer, user.id, supabase);

    await supabase.storage.from(BACKUP_IMPORTS_BUCKET).remove([normalized]);

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
