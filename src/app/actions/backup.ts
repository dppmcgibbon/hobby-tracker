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

    // Normalize ID for mapping keys/lookups (CSV can have spaces or different formatting)
    const tid = (x: unknown): string => {
      if (x == null || x === "") return "";
      let s = String(x).trim();
      if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
      return s;
    };

    // Build mappings for reference tables (old UUID -> new UUID)
    const factionMapping: { [oldId: string]: string | null } = {};
    const paintMapping: { [oldId: string]: string | null } = {};
    const gameMapping: { [oldId: string]: string | null } = {};
    const editionMapping: { [oldId: string]: string | null } = {};
    const expansionMapping: { [oldId: string]: string | null } = {};
    const baseMapping: { [oldId: string]: string | null } = {};
    const baseShapeMapping: { [oldId: string]: string | null } = {};
    const baseTypeMapping: { [oldId: string]: string | null } = {};

    // Map factions by name (trimmed keys for lookup consistency)
    if (backupData.factions) {
      const backupFactions = parseCSV(backupData.factions);
      const { data: currentFactions } = await supabase.from("factions").select("id, name");
      if (currentFactions) {
        const factionNameMap = new Map(currentFactions.map((f) => [String(f.name ?? "").trim(), f.id]));
        backupFactions.forEach((oldFaction) => {
          const name = String(oldFaction.name ?? "").trim();
          const newId = name ? factionNameMap.get(name) ?? null : null;
          const oldId = tid(oldFaction.id);
          if (oldId) factionMapping[oldId] = newId;
        });
      }
    }

    // Map paints by brand, name, and type (trimmed keys)
    if (backupData.paints) {
      const backupPaints = parseCSV(backupData.paints);
      const { data: currentPaints } = await supabase.from("paints").select("id, brand, name, type");
      if (currentPaints) {
        const paintKeyMap = new Map(
          currentPaints.map((p) => [`${String(p.brand ?? "").trim()}:${String(p.name ?? "").trim()}:${String(p.type ?? "").trim()}`, p.id])
        );
        backupPaints.forEach((oldPaint) => {
          const b = String(oldPaint.brand ?? "").trim();
          const n = String(oldPaint.name ?? "").trim();
          const t = oldPaint.type?.trim() || "layer";
          const newId = b && n ? paintKeyMap.get(`${b}:${n}:${t}`) ?? null : null;
          const oldId = tid(oldPaint.id);
          if (oldId) paintMapping[oldId] = newId;
        });
      }
    }

    // Map games by name (use trimmed ids as keys so CSV formatting matches)
    if (backupData.games) {
      const backupGames = parseCSV(backupData.games);
      const { data: currentGames } = await supabase.from("games").select("id, name");
      
      if (currentGames) {
        const gameNameMap = new Map(
          currentGames.map((g) => [String(g.name || "").trim(), g.id])
        );
        backupGames.forEach((oldGame) => {
          const name = String(oldGame.name ?? "").trim();
          const newId = name ? gameNameMap.get(name) ?? null : null;
          const oldId = tid(oldGame.id);
          if (oldId) gameMapping[oldId] = newId;
        });
      }
    }

    // Map bases, base_shapes, base_types by name (trimmed keys)
    if (backupData.bases) {
      const backupBases = parseCSV(backupData.bases);
      const { data: currentBases } = await supabase.from("bases").select("id, name");
      if (currentBases) {
        const m = new Map(currentBases.map((b) => [String(b.name ?? "").trim(), b.id]));
        backupBases.forEach((old) => {
          const id = tid(old.id);
          if (id) baseMapping[id] = (m.get(String(old.name ?? "").trim()) ?? null) as string | null;
        });
      }
    }
    if (backupData.base_shapes) {
      const backupBaseShapes = parseCSV(backupData.base_shapes);
      const { data: current } = await supabase.from("base_shapes").select("id, name");
      if (current) {
        const m = new Map(current.map((b) => [String(b.name ?? "").trim(), b.id]));
        backupBaseShapes.forEach((old) => {
          const id = tid(old.id);
          if (id) baseShapeMapping[id] = (m.get(String(old.name ?? "").trim()) ?? null) as string | null;
        });
      }
    }
    if (backupData.base_types) {
      const backupBaseTypes = parseCSV(backupData.base_types);
      const { data: current } = await supabase.from("base_types").select("id, name");
      if (current) {
        const m = new Map(current.map((b) => [String(b.name ?? "").trim(), b.id]));
        backupBaseTypes.forEach((old) => {
          const id = tid(old.id);
          if (id) baseTypeMapping[id] = (m.get(String(old.name ?? "").trim()) ?? null) as string | null;
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
        const gameIdToName = new Map(backupGames.map((g) => [tid(g.id), g.name]));
        
        // Create a map of (game_name, edition_name) -> edition_id
        const editionKeyMap = new Map<string, string>();
        for (const edition of currentEditions) {
          const { data: game } = await supabase.from("games").select("name").eq("id", edition.game_id).single();
          if (game) {
            editionKeyMap.set(`${game.name}:${edition.name}`, edition.id);
          }
        }
        
        backupEditions.forEach((oldEdition) => {
          const gameName = gameIdToName.get(tid(oldEdition.game_id));
          if (gameName) {
            const key = `${gameName}:${String(oldEdition.name ?? "").trim()}`;
            const newId = editionKeyMap.get(key) || null;
            const oldId = tid(oldEdition.id);
            if (oldId) editionMapping[oldId] = newId;
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
        const gameIdToName = new Map(backupGames.map((g) => [tid(g.id), g.name]));
        
        // Create a map of (game_name, expansion_name) -> expansion_id
        const expansionKeyMap = new Map<string, string>();
        for (const expansion of currentExpansions) {
          const { data: game } = await supabase.from("games").select("name").eq("id", expansion.game_id).single();
          if (game) {
            expansionKeyMap.set(`${game.name}:${expansion.name}`, expansion.id);
          }
        }
        
        backupExpansions.forEach((oldExpansion) => {
          const gameName = gameIdToName.get(tid(oldExpansion.game_id));
          if (gameName) {
            const key = `${gameName}:${String(oldExpansion.name ?? "").trim()}`;
            const newId = expansionKeyMap.get(key) || null;
            const oldId = tid(oldExpansion.id);
            if (oldId) expansionMapping[oldId] = newId;
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
        const newId = statusNameToId.get(String(oldStatus.name ?? "").trim()) ?? null;
        const oldId = tid(oldStatus.id);
        if (oldId) statusMapping[oldId] = newId;
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

        // Map foreign keys for miniatures (trimmed lookup)
        if (tableName === "miniatures") {
          processedRow.faction_id = factionMapping[tid(processedRow.faction_id)] ?? null;
          processedRow.base_id = baseMapping[tid(processedRow.base_id)] ?? null;
          processedRow.base_shape_id = baseShapeMapping[tid(processedRow.base_shape_id)] ?? null;
          processedRow.base_type_id = baseTypeMapping[tid(processedRow.base_type_id)] ?? null;
          processedRow.storage_box_id = storageBoxIdMapping[tid(processedRow.storage_box_id)] ?? null;
        }

        // Map miniature_id: use mapping when present, else keep normalized original (miniatures inserted with backup id)
        if (
          tableName === "miniature_photos" ||
          tableName === "miniature_status" ||
          tableName === "miniature_tags" ||
          tableName === "miniature_games" ||
          tableName === "shared_miniatures"
        ) {
          const mid = tid(processedRow.miniature_id);
          processedRow.miniature_id = (mid && miniatureIdMapping[mid]) ?? (mid || null);
        }
        if (tableName === "miniature_tags") {
          const tagId = tid(processedRow.tag_id);
          processedRow.tag_id = (tagId && tagIdMapping[tagId]) ?? (tagId || null);
        }
        if (tableName === "collection_miniatures") {
          const cid = tid(processedRow.collection_id);
          const mid = tid(processedRow.miniature_id);
          processedRow.collection_id = (cid && collectionIdMapping[cid]) ?? (cid || null);
          processedRow.miniature_id = (mid && miniatureIdMapping[mid]) ?? (mid || null);
        }
        if (tableName === "recipe_steps") {
          const rid = tid(processedRow.recipe_id);
          const pid = tid(processedRow.paint_id);
          processedRow.recipe_id = (rid && recipeIdMapping[rid]) ?? (rid || null);
          processedRow.paint_id = (pid && paintMapping[pid]) ?? (pid || null);
        }
        if (tableName === "miniature_recipes") {
          const mid = tid(processedRow.miniature_id);
          const rid = tid(processedRow.recipe_id);
          processedRow.miniature_id = (mid && miniatureIdMapping[mid]) ?? (mid || null);
          processedRow.recipe_id = (rid && recipeIdMapping[rid]) ?? (rid || null);
        }

        // Map foreign keys for miniature_games (trimmed lookup)
        if (tableName === "miniature_games") {
          const gid = tid(processedRow.game_id);
          const eid = tid(processedRow.edition_id);
          const exid = tid(processedRow.expansion_id);
          processedRow.game_id = (gid && gameMapping[gid]) ?? null;
          processedRow.edition_id = (eid && editionMapping[eid]) ?? null;
          processedRow.expansion_id = (exid && expansionMapping[exid]) ?? null;
        }

        // Map paint_id for user_paints: use mapping or keep normalized original
        if (tableName === "user_paints") {
          const pid = tid(processedRow.paint_id);
          processedRow.paint_id = (pid && paintMapping[pid]) ?? (pid || null);
        }

        // Map status_id for miniature_status: use mapping or keep normalized original
        if (tableName === "miniature_status") {
          const sid = tid(processedRow.status_id);
          processedRow.status_id = (sid && statusMapping[sid]) ?? (sid || null);
        }

        return processedRow;
      });

      // Skip rows with missing required FKs to avoid NOT NULL / FK violations (all junction and child tables)
      let rowsToInsert = processedRows;
      if (tableName === "miniature_games") {
        rowsToInsert = processedRows.filter((r) => r.game_id != null && r.game_id !== "");
      } else if (tableName === "miniature_tags") {
        rowsToInsert = processedRows.filter((r) => r.miniature_id && r.tag_id);
      } else if (tableName === "miniature_recipes") {
        rowsToInsert = processedRows.filter((r) => r.miniature_id && r.recipe_id);
      } else if (tableName === "collection_miniatures") {
        rowsToInsert = processedRows.filter((r) => r.collection_id && r.miniature_id);
      } else if (tableName === "miniature_photos" || tableName === "miniature_status" || tableName === "shared_miniatures") {
        rowsToInsert = processedRows.filter((r) => r.miniature_id != null && r.miniature_id !== "");
      } else if (tableName === "recipe_steps") {
        rowsToInsert = processedRows.filter((r) => r.recipe_id != null && r.recipe_id !== "");
      } else if (tableName === "user_paints") {
        rowsToInsert = processedRows.filter((r) => r.paint_id != null && r.paint_id !== "");
      }

      // Insert data in batches of 100 to avoid timeouts; use .select('id') to build id mappings
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        const { data: inserted, error } = await supabase
          .from(tableName)
          .insert(batch)
          .select("id");

        if (error) {
          console.error(`Error importing ${tableName} (batch ${i / batchSize + 1}):`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }

        // Build backup id -> inserted id mapping for parent tables (order matches batch; use min length if response differs)
        if (inserted && inserted.length > 0) {
          const len = Math.min(inserted.length, batch.length);
          if (tableName === "tags") {
            for (let idx = 0; idx < len; idx++) {
              const k = tid(batch[idx].id);
              if (k) tagIdMapping[k] = inserted[idx].id;
            }
          } else if (tableName === "storage_boxes") {
            for (let idx = 0; idx < len; idx++) {
              const k = tid(batch[idx].id);
              if (k) storageBoxIdMapping[k] = inserted[idx].id;
            }
          } else if (tableName === "miniatures") {
            for (let idx = 0; idx < len; idx++) {
              const k = tid(batch[idx].id);
              if (k) miniatureIdMapping[k] = inserted[idx].id;
            }
          } else if (tableName === "painting_recipes") {
            for (let idx = 0; idx < len; idx++) {
              const k = tid(batch[idx].id);
              if (k) recipeIdMapping[k] = inserted[idx].id;
            }
          } else if (tableName === "collections") {
            for (let idx = 0; idx < len; idx++) {
              const k = tid(batch[idx].id);
              if (k) collectionIdMapping[k] = inserted[idx].id;
            }
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
  const criticalTables = ["miniature_photos", "miniature_status", "miniature_tags", "miniature_games"];
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
