"use server";

import JSZip from "jszip";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
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
  if (!csv || csv.trim().length === 0) return [];

  const lines = csv.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
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
          
          // Process the combined data
          if (allData.length > 0) {
            const csv = convertToCSV(allData, table);
            backups.push({
              tableName: table,
              csv,
              rowCount: allData.length,
            });
          }
          
          // Skip the normal query execution
          continue;
        } else {
          // No miniatures, skip this table
          continue;
        }
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
          
          // Process the combined data
          if (allData.length > 0) {
            const csv = convertToCSV(allData, table);
            backups.push({
              tableName: table,
              csv,
              rowCount: allData.length,
            });
          }
          
          // Skip the normal query execution
          continue;
        } else {
          // No collections, skip this table
          continue;
        }
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
          
          // Process the combined data
          if (allData.length > 0) {
            const csv = convertToCSV(allData, table);
            backups.push({
              tableName: table,
              csv,
              rowCount: allData.length,
            });
          }
          
          // Skip the normal query execution
          continue;
        } else {
          // No recipes, skip this table
          continue;
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        throw new Error(`Failed to backup ${table}: ${error.message}`);
      }

      if (data && data.length > 0) {
        const csv = convertToCSV(data, table);
        backups.push({
          tableName: table,
          csv,
          rowCount: data.length,
        });

        // Download actual photo files if this is the miniature_photos table
        if (table === "miniature_photos") {
          for (const photo of data) {
            if (photo.storage_path) {
              try {
                const { data: fileData, error: downloadError } = await supabase.storage
                  .from("miniature-photos")
                  .download(photo.storage_path);

                if (!downloadError && fileData) {
                  photoFiles.push({
                    path: photo.storage_path,
                    blob: fileData,
                  });
                } else {
                  console.warn(`Failed to download photo: ${photo.storage_path}`, downloadError);
                }
              } catch (downloadError) {
                console.warn(`Error downloading photo: ${photo.storage_path}`, downloadError);
              }
            }
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

export async function importDatabaseBackup(backupData: {
  [tableName: string]: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  try {
    // --- Insert missing reference data: universes, army_types, miniature_statuses ---
    const universeMapping: { [oldId: string]: string | null } = {};
    if (backupData.universes) {
      const backupUniverses = parseCSV(backupData.universes);
      const { data: existingUniverses } = await supabase.from("universes").select("id, name");
      const existingByName = new Map((existingUniverses || []).map((u) => [u.name, u.id]));
      for (const row of backupUniverses) {
        const name = row.name?.trim();
        if (!name) continue;
        if (existingByName.has(name)) {
          const id = existingByName.get(name)!;
          universeMapping[row.id] = id;
        } else {
          const { data: inserted } = await supabase
            .from("universes")
            .insert({ name: row.name })
            .select("id, name")
            .single();
          if (inserted) {
            existingByName.set(inserted.name, inserted.id);
            universeMapping[row.id] = inserted.id;
          }
        }
      }
    }

    if (backupData.army_types) {
      const backupArmyTypes = parseCSV(backupData.army_types);
      const { data: existing } = await supabase.from("army_types").select("id, name");
      const existingByName = new Map((existing || []).map((a) => [a.name, a.id]));
      for (const row of backupArmyTypes) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const { data: inserted } = await supabase
          .from("army_types")
          .insert({ name: row.name, description: row.description ?? null })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    if (backupData.miniature_statuses) {
      const backupStatuses = parseCSV(backupData.miniature_statuses);
      const { data: existing } = await supabase.from("miniature_statuses").select("id, name");
      const existingByName = new Map((existing || []).map((s) => [s.name, s.id]));
      for (const row of backupStatuses) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const { data: inserted } = await supabase
          .from("miniature_statuses")
          .insert({
            name: row.name,
            display_order: parseInt(String(row.display_order), 10) || 0,
          })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    // --- Insert missing reference data: games, editions, expansions ---
    // So production has the same games as the backup and miniature_games links resolve.
    if (backupData.games) {
      const backupGames = parseCSV(backupData.games);
      const { data: existingGames } = await supabase.from("games").select("id, name");
      const existingByName = new Map((existingGames || []).map((g) => [g.name, g.id]));

      for (const row of backupGames) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const universeId = row.universe_id ? (universeMapping[row.universe_id] ?? null) : null;
        const { data: inserted } = await supabase
          .from("games")
          .insert({
            name: row.name,
            description: row.description ?? null,
            publisher: row.publisher ?? null,
            universe_id: universeId,
          })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    if (backupData.editions && backupData.games) {
      const backupEditions = parseCSV(backupData.editions);
      const backupGames = parseCSV(backupData.games);
      const gameIdToName = new Map(backupGames.map((g) => [g.id, g.name]));
      const { data: existingEditions } = await supabase
        .from("editions")
        .select("id, game_id, name");
      const { data: existingGames } = await supabase.from("games").select("id, name");
      const gameNameToId = new Map((existingGames || []).map((g) => [g.name, g.id]));
      const editionKey = (gameName: string, editionName: string) => `${gameName}:${editionName}`;
      const existingEditionKeys = new Set<string>();
      for (const e of existingEditions || []) {
        const g = (existingGames || []).find((x) => x.id === e.game_id);
        if (g) existingEditionKeys.add(editionKey(g.name, e.name));
      }

      for (const row of backupEditions) {
        const gameName = gameIdToName.get(row.game_id);
        if (!gameName) continue;
        const key = editionKey(gameName, (row.name || "").trim());
        if (existingEditionKeys.has(key)) continue;
        const gameId = gameNameToId.get(gameName);
        if (!gameId) continue;
        const { data: inserted } = await supabase
          .from("editions")
          .insert({
            game_id: gameId,
            name: row.name,
            sequence: parseInt(String(row.sequence), 10) || 1,
            year: row.year != null && row.year !== "" ? parseInt(String(row.year), 10) : null,
            description: row.description ?? null,
          })
          .select("id, name")
          .single();
        if (inserted) existingEditionKeys.add(editionKey(gameName, inserted.name));
      }
    }

    if (backupData.expansions && backupData.editions && backupData.games) {
      const backupExpansions = parseCSV(backupData.expansions);
      const backupEditions = parseCSV(backupData.editions);
      const backupGames = parseCSV(backupData.games);
      const gameIdToName = new Map(backupGames.map((g) => [g.id, g.name]));
      const editionIdToGameNameAndEditionName = new Map<string, { gameName: string; editionName: string }>();
      for (const e of backupEditions) {
        const gameName = gameIdToName.get(e.game_id);
        if (gameName) editionIdToGameNameAndEditionName.set(e.id, { gameName, editionName: e.name });
      }
      const { data: existingExpansions } = await supabase
        .from("expansions")
        .select("id, edition_id, name");
      const { data: existingEditions } = await supabase
        .from("editions")
        .select("id, name, game_id");
      const { data: existingGames } = await supabase
        .from("games")
        .select("id, name");
      const gameIdToNameCurrent = new Map((existingGames || []).map((g) => [g.id, g.name]));
      const expansionKey = (editionId: string, expansionName: string) => `${editionId}:${expansionName}`;
      const existingExpansionKeys = new Set<string>();
      for (const ex of existingExpansions || []) {
        existingExpansionKeys.add(expansionKey(ex.edition_id, ex.name));
      }

      for (const row of backupExpansions) {
        const meta = editionIdToGameNameAndEditionName.get(row.edition_id);
        if (!meta) continue;
        const key = expansionKey(row.edition_id, (row.name || "").trim());
        if (existingExpansionKeys.has(key)) continue;
        const editionRow = (existingEditions || []).find(
          (e) => {
            const gName = gameIdToNameCurrent.get(e.game_id);
            return gName === meta.gameName && e.name === meta.editionName;
          }
        );
        if (!editionRow) continue;
        const { data: inserted } = await supabase
          .from("expansions")
          .insert({
            edition_id: editionRow.id,
            name: row.name,
            sequence: parseInt(String(row.sequence), 10) || 1,
            year: row.year != null && row.year !== "" ? parseInt(String(row.year), 10) : null,
            description: row.description ?? null,
          })
          .select("id")
          .single();
        if (inserted) existingExpansionKeys.add(expansionKey(editionRow.id, row.name));
      }
    }

    // --- Insert missing reference data: factions, paints, bases, base_shapes, base_types ---
    if (backupData.factions) {
      const backupFactions = parseCSV(backupData.factions);
      const { data: existing } = await supabase.from("factions").select("id, name");
      const existingByName = new Map((existing || []).map((f) => [f.name, f.id]));
      for (const row of backupFactions) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const armyType = row.army_type?.trim() || "imperium";
        const { data: inserted } = await supabase
          .from("factions")
          .insert({
            name: row.name,
            army_type: armyType,
            description: row.description ?? null,
            color_hex: row.color_hex ?? null,
          })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    if (backupData.paints) {
      const backupPaints = parseCSV(backupData.paints);
      const { data: existing } = await supabase.from("paints").select("id, brand, name, type");
      const existingByKey = new Map(
        (existing || []).map((p) => [`${p.brand}:${p.name}:${p.type}`, p.id])
      );
      for (const row of backupPaints) {
        const brand = row.brand?.trim();
        const name = row.name?.trim();
        const type = row.type?.trim() || "layer";
        if (!brand || !name) continue;
        const key = `${brand}:${name}:${type}`;
        if (existingByKey.has(key)) continue;
        const { data: inserted } = await supabase
          .from("paints")
          .insert({
            brand: row.brand,
            name: row.name,
            type,
            color_hex: row.color_hex ?? null,
          })
          .select("id, brand, name, type")
          .single();
        if (inserted) existingByKey.set(`${inserted.brand}:${inserted.name}:${inserted.type}`, inserted.id);
      }
    }

    if (backupData.bases) {
      const backupBases = parseCSV(backupData.bases);
      const { data: existing } = await supabase.from("bases").select("id, name");
      const existingByName = new Map((existing || []).map((b) => [b.name, b.id]));
      for (const row of backupBases) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const { data: inserted } = await supabase
          .from("bases")
          .insert({ name: row.name })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    if (backupData.base_shapes) {
      const backupBaseShapes = parseCSV(backupData.base_shapes);
      const { data: existing } = await supabase.from("base_shapes").select("id, name");
      const existingByName = new Map((existing || []).map((bs) => [bs.name, bs.id]));
      for (const row of backupBaseShapes) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const { data: inserted } = await supabase
          .from("base_shapes")
          .insert({ name: row.name })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    if (backupData.base_types) {
      const backupBaseTypes = parseCSV(backupData.base_types);
      const { data: existing } = await supabase.from("base_types").select("id, name");
      const existingByName = new Map((existing || []).map((bt) => [bt.name, bt.id]));
      for (const row of backupBaseTypes) {
        const name = row.name?.trim();
        if (!name || existingByName.has(name)) continue;
        const { data: inserted } = await supabase
          .from("base_types")
          .insert({ name: row.name })
          .select("id, name")
          .single();
        if (inserted) existingByName.set(inserted.name, inserted.id);
      }
    }

    // Define table order for import (respecting foreign key dependencies)
    // NOTE: Reference tables (factions, paints, games, editions, expansions) are either
    // already present or were inserted above; we only map IDs when importing user data.
    const importOrder = [
      // User-owned tables
      "tags",
      "storage_boxes",
      "miniatures",
      "miniature_status",
      "miniature_photos",
      "painting_recipes",
      "recipe_steps",
      "collections",
      "collection_miniatures",
      "user_paints",
      "saved_filters",
      // Junction tables last
      "miniature_tags",
      "miniature_recipes",
      "miniature_games",
      "shared_miniatures",
    ];

    const results: { [table: string]: number } = {};

    // Build mappings for reference tables (old UUID -> new UUID)
    const factionMapping: { [oldId: string]: string | null } = {};
    const paintMapping: { [oldId: string]: string | null } = {};
    const gameMapping: { [oldId: string]: string | null } = {};
    const editionMapping: { [oldId: string]: string | null } = {};
    const expansionMapping: { [oldId: string]: string | null } = {};
    const baseMapping: { [oldId: string]: string | null } = {};
    const baseShapeMapping: { [oldId: string]: string | null } = {};
    const baseTypeMapping: { [oldId: string]: string | null } = {};

    // Map factions by name
    if (backupData.factions) {
      const backupFactions = parseCSV(backupData.factions);
      const { data: currentFactions } = await supabase.from("factions").select("id, name");
      
      if (currentFactions) {
        const factionNameMap = new Map(currentFactions.map((f) => [f.name, f.id]));
        backupFactions.forEach((oldFaction) => {
          const newId = factionNameMap.get(oldFaction.name) || null;
          factionMapping[oldFaction.id] = newId;
        });
      }
    }

    // Map paints by brand, name, and type
    if (backupData.paints) {
      const backupPaints = parseCSV(backupData.paints);
      const { data: currentPaints } = await supabase.from("paints").select("id, brand, name, type");
      
      if (currentPaints) {
        const paintKeyMap = new Map(
          currentPaints.map((p) => [`${p.brand}:${p.name}:${p.type}`, p.id])
        );
        backupPaints.forEach((oldPaint) => {
          const type = oldPaint.type?.trim() || "layer";
          const key = `${oldPaint.brand}:${oldPaint.name}:${type}`;
          const newId = paintKeyMap.get(key) || null;
          paintMapping[oldPaint.id] = newId;
        });
      }
    }

    // Map games by name
    if (backupData.games) {
      const backupGames = parseCSV(backupData.games);
      const { data: currentGames } = await supabase.from("games").select("id, name");
      
      if (currentGames) {
        const gameNameMap = new Map(currentGames.map((g) => [g.name, g.id]));
        backupGames.forEach((oldGame) => {
          const newId = gameNameMap.get(oldGame.name) || null;
          gameMapping[oldGame.id] = newId;
        });
      }
    }

    // Map bases by name
    if (backupData.bases) {
      const backupBases = parseCSV(backupData.bases);
      const { data: currentBases } = await supabase.from("bases").select("id, name");
      
      if (currentBases) {
        const baseNameMap = new Map(currentBases.map((b) => [b.name, b.id]));
        backupBases.forEach((oldBase) => {
          const newId = baseNameMap.get(oldBase.name) || null;
          baseMapping[oldBase.id] = newId;
        });
      }
    }

    // Map base_shapes by name
    if (backupData.base_shapes) {
      const backupBaseShapes = parseCSV(backupData.base_shapes);
      const { data: currentBaseShapes } = await supabase.from("base_shapes").select("id, name");
      
      if (currentBaseShapes) {
        const baseShapeNameMap = new Map(currentBaseShapes.map((bs) => [bs.name, bs.id]));
        backupBaseShapes.forEach((oldBaseShape) => {
          const newId = baseShapeNameMap.get(oldBaseShape.name) || null;
          baseShapeMapping[oldBaseShape.id] = newId;
        });
      }
    }

    // Map base_types by name
    if (backupData.base_types) {
      const backupBaseTypes = parseCSV(backupData.base_types);
      const { data: currentBaseTypes } = await supabase.from("base_types").select("id, name");
      
      if (currentBaseTypes) {
        const baseTypeNameMap = new Map(currentBaseTypes.map((bt) => [bt.name, bt.id]));
        backupBaseTypes.forEach((oldBaseType) => {
          const newId = baseTypeNameMap.get(oldBaseType.name) || null;
          baseTypeMapping[oldBaseType.id] = newId;
        });
      }
    }

    // Map editions by game and name
    if (backupData.editions && backupData.games) {
      const backupEditions = parseCSV(backupData.editions);
      const backupGames = parseCSV(backupData.games);
      const { data: currentEditions } = await supabase.from("editions").select("id, game_id, name");
      
      if (currentEditions) {
        // Create a map of old game_id -> game name
        const gameIdToName = new Map(backupGames.map((g) => [g.id, g.name]));
        
        // Create a map of (game_name, edition_name) -> edition_id
        const editionKeyMap = new Map();
        for (const edition of currentEditions) {
          const { data: game } = await supabase.from("games").select("name").eq("id", edition.game_id).single();
          if (game) {
            editionKeyMap.set(`${game.name}:${edition.name}`, edition.id);
          }
        }
        
        backupEditions.forEach((oldEdition) => {
          const gameName = gameIdToName.get(oldEdition.game_id);
          if (gameName) {
            const key = `${gameName}:${oldEdition.name}`;
            const newId = editionKeyMap.get(key) || null;
            editionMapping[oldEdition.id] = newId;
          }
        });
      }
    }

    // Map expansions by game and name
    if (backupData.expansions && backupData.games) {
      const backupExpansions = parseCSV(backupData.expansions);
      const backupGames = parseCSV(backupData.games);
      const { data: currentExpansions } = await supabase.from("expansions").select("id, game_id, name");
      
      if (currentExpansions) {
        // Create a map of old game_id -> game name
        const gameIdToName = new Map(backupGames.map((g) => [g.id, g.name]));
        
        // Create a map of (game_name, expansion_name) -> expansion_id
        const expansionKeyMap = new Map();
        for (const expansion of currentExpansions) {
          const { data: game } = await supabase.from("games").select("name").eq("id", expansion.game_id).single();
          if (game) {
            expansionKeyMap.set(`${game.name}:${expansion.name}`, expansion.id);
          }
        }
        
        backupExpansions.forEach((oldExpansion) => {
          const gameName = gameIdToName.get(oldExpansion.game_id);
          if (gameName) {
            const key = `${gameName}:${oldExpansion.name}`;
            const newId = expansionKeyMap.get(key) || null;
            expansionMapping[oldExpansion.id] = newId;
          }
        });
      }
    }

    // Map miniature_statuses (backup id -> current id by name) for miniature_status.status_id
    const statusMapping: { [oldId: string]: string | null } = {};
    if (backupData.miniature_statuses) {
      const backupStatuses = parseCSV(backupData.miniature_statuses);
      const { data: currentStatuses } = await supabase.from("miniature_statuses").select("id, name");
      const statusNameToId = new Map((currentStatuses || []).map((s) => [s.name, s.id]));
      backupStatuses.forEach((oldStatus) => {
        const newId = statusNameToId.get(oldStatus.name) ?? null;
        statusMapping[oldStatus.id] = newId;
      });
    }

    // Mappings from backup id -> inserted id (built as we insert parent tables)
    const tagIdMapping: { [oldId: string]: string } = {};
    const storageBoxIdMapping: { [oldId: string]: string } = {};
    const miniatureIdMapping: { [oldId: string]: string } = {};
    const recipeIdMapping: { [oldId: string]: string } = {};
    const collectionIdMapping: { [oldId: string]: string } = {};

    // Insert paint_equivalents with mapped paint IDs (only where both sides exist)
    if (backupData.paint_equivalents) {
      const backupEquivalents = parseCSV(backupData.paint_equivalents);
      for (const row of backupEquivalents) {
        const paintId = paintMapping[row.paint_id];
        const equivalentId = paintMapping[row.equivalent_paint_id];
        if (paintId && equivalentId && paintId !== equivalentId) {
          await supabase.from("paint_equivalents").upsert(
            [{ paint_id: paintId, equivalent_paint_id: equivalentId }],
            { onConflict: "paint_id,equivalent_paint_id" }
          );
        }
      }
    }

    // Delete existing user data first (order: child/junction then parents to avoid FK issues)
    const userTablesToDelete = [
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

    for (const table of userTablesToDelete) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) {
        console.error(`Error deleting ${table}:`, error);
      }
    }

    // Import data in order
    for (const tableName of importOrder) {
      if (!backupData[tableName]) continue;

      const csvData = backupData[tableName];
      const rows = parseCSV(csvData);

      if (rows.length === 0) continue;

      // Replace user_id with current user's ID and map foreign keys
      const processedRows = rows.map((row) => {
        const processedRow = { ...row };
        
        // Replace user_id for user-owned tables
        if (userTablesToDelete.includes(tableName) && processedRow.user_id) {
          processedRow.user_id = user.id;
        }

        // Map foreign keys for miniatures
        if (tableName === "miniatures") {
          if (processedRow.faction_id) {
            if (factionMapping[processedRow.faction_id] !== undefined) {
              processedRow.faction_id = factionMapping[processedRow.faction_id];
            } else {
              processedRow.faction_id = null;
            }
          }
          if (processedRow.base_id) {
            if (baseMapping[processedRow.base_id] !== undefined) {
              processedRow.base_id = baseMapping[processedRow.base_id];
            } else {
              processedRow.base_id = null;
            }
          }
          if (processedRow.base_shape_id) {
            if (baseShapeMapping[processedRow.base_shape_id] !== undefined) {
              processedRow.base_shape_id = baseShapeMapping[processedRow.base_shape_id];
            } else {
              processedRow.base_shape_id = null;
            }
          }
          if (processedRow.base_type_id) {
            if (baseTypeMapping[processedRow.base_type_id] !== undefined) {
              processedRow.base_type_id = baseTypeMapping[processedRow.base_type_id];
            } else {
              processedRow.base_type_id = null;
            }
          }
          if (processedRow.storage_box_id) {
            processedRow.storage_box_id = storageBoxIdMapping[processedRow.storage_box_id] ?? null;
          }
        }

        // Map miniature_id for tables that reference miniatures (use mapping built during insert)
        if (
          (tableName === "miniature_photos" ||
            tableName === "miniature_status" ||
            tableName === "miniature_tags" ||
            tableName === "miniature_games" ||
            tableName === "shared_miniatures") &&
          processedRow.miniature_id
        ) {
          processedRow.miniature_id = miniatureIdMapping[processedRow.miniature_id] ?? processedRow.miniature_id;
        }
        if (tableName === "miniature_tags" && processedRow.tag_id) {
          processedRow.tag_id = tagIdMapping[processedRow.tag_id] ?? processedRow.tag_id;
        }
        if (tableName === "collection_miniatures") {
          if (processedRow.collection_id) {
            processedRow.collection_id = collectionIdMapping[processedRow.collection_id] ?? processedRow.collection_id;
          }
          if (processedRow.miniature_id) {
            processedRow.miniature_id = miniatureIdMapping[processedRow.miniature_id] ?? processedRow.miniature_id;
          }
        }
        if (tableName === "recipe_steps" && processedRow.recipe_id) {
          processedRow.recipe_id = recipeIdMapping[processedRow.recipe_id] ?? processedRow.recipe_id;
        }
        if (tableName === "miniature_recipes") {
          if (processedRow.miniature_id) {
            processedRow.miniature_id = miniatureIdMapping[processedRow.miniature_id] ?? processedRow.miniature_id;
          }
          if (processedRow.recipe_id) {
            processedRow.recipe_id = recipeIdMapping[processedRow.recipe_id] ?? processedRow.recipe_id;
          }
        }

        // Map foreign keys for recipe_steps
        if (tableName === "recipe_steps") {
          if (processedRow.paint_id) {
            if (paintMapping[processedRow.paint_id] !== undefined) {
              processedRow.paint_id = paintMapping[processedRow.paint_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.paint_id = null;
            }
          }
        }

        // Map foreign keys for miniature_games
        if (tableName === "miniature_games") {
          if (processedRow.game_id) {
            if (gameMapping[processedRow.game_id] !== undefined) {
              processedRow.game_id = gameMapping[processedRow.game_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.game_id = null;
            }
          }
          if (processedRow.edition_id) {
            if (editionMapping[processedRow.edition_id] !== undefined) {
              processedRow.edition_id = editionMapping[processedRow.edition_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.edition_id = null;
            }
          }
          if (processedRow.expansion_id) {
            if (expansionMapping[processedRow.expansion_id] !== undefined) {
              processedRow.expansion_id = expansionMapping[processedRow.expansion_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.expansion_id = null;
            }
          }
        }

        // Map foreign keys for user_paints
        if (tableName === "user_paints") {
          if (processedRow.paint_id) {
            if (paintMapping[processedRow.paint_id] !== undefined) {
              processedRow.paint_id = paintMapping[processedRow.paint_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.paint_id = null;
            }
          }
        }

        // Map foreign keys for miniature_status (status_id -> new miniature_statuses id)
        if (tableName === "miniature_status" && processedRow.status_id) {
          if (statusMapping[processedRow.status_id] !== undefined) {
            processedRow.status_id = statusMapping[processedRow.status_id];
          } else {
            processedRow.status_id = null;
          }
        }

        return processedRow;
      });

      // Insert data in batches of 100 to avoid timeouts; use .select('id') to build id mappings
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < processedRows.length; i += batchSize) {
        const batch = processedRows.slice(i, i + batchSize);
        const { data: inserted, error } = await supabase
          .from(tableName)
          .insert(batch)
          .select("id");

        if (error) {
          console.error(`Error importing ${tableName} (batch ${i / batchSize + 1}):`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }

        // Build backup id -> inserted id mapping for parent tables (order matches batch)
        if (inserted && inserted.length === batch.length) {
          if (tableName === "tags") {
            batch.forEach((row, idx) => {
              if (row.id != null) tagIdMapping[row.id] = inserted[idx].id;
            });
          } else if (tableName === "storage_boxes") {
            batch.forEach((row, idx) => {
              if (row.id != null) storageBoxIdMapping[row.id] = inserted[idx].id;
            });
          } else if (tableName === "miniatures") {
            batch.forEach((row, idx) => {
              if (row.id != null) miniatureIdMapping[row.id] = inserted[idx].id;
            });
          } else if (tableName === "painting_recipes") {
            batch.forEach((row, idx) => {
              if (row.id != null) recipeIdMapping[row.id] = inserted[idx].id;
            });
          } else if (tableName === "collections") {
            batch.forEach((row, idx) => {
              if (row.id != null) collectionIdMapping[row.id] = inserted[idx].id;
            });
          }
        }

        insertedCount += batch.length;
      }

      results[tableName] = insertedCount;
    }

    // Update current user's profile from backup (display_name, avatar_url) if present
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

    // Insert missing collect-app rows (by id) so we don't overwrite existing
    const collectTables = ["collect_apps", "collect_config", "boardgames", "magazines", "records", "stories"] as const;
    for (const tableName of collectTables) {
      if (!backupData[tableName]) continue;
      const rows = parseCSV(backupData[tableName]);
      if (rows.length === 0) continue;
      const { data: existing } = await supabase.from(tableName).select("id");
      const existingIds = new Set((existing || []).map((r: { id: number }) => r.id));
      const toInsert = rows.filter((r) => {
        const id = r.id != null ? parseInt(String(r.id), 10) : NaN;
        return !Number.isNaN(id) && !existingIds.has(id);
      });
      if (toInsert.length === 0) continue;
      const batchSize = 50;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName).insert(batch);
        if (error) console.error(`Error importing ${tableName}:`, error);
        else results[tableName] = (results[tableName] || 0) + batch.length;
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

/** Extract table name from ZIP entry path (normalize slashes and prefix). */
function tableNameFromZipPath(filename: string): string | null {
  const normalized = filename.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("data/") && normalized.endsWith(".csv")) {
    return normalized.slice(5, -4);
  }
  return null;
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

  if (Object.keys(backupData).length === 0) {
    return { ...IMPORT_RESULT_FAIL, photoErrors: ["No CSV files found in backup"] };
  }

  const result = await importDatabaseBackup(backupData);
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

/**
 * Import a database backup from a ZIP file (server-side).
 * Parses the ZIP on the server to avoid payload size limits that drop tables.
 */
export async function importDatabaseBackupFromFile(formData: FormData): Promise<ImportFromZipResult> {
  const user = await requireAuth();
  const supabase = await createClient();

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
  const supabase = await createClient();

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
