"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

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
        // Convert to string and escape quotes
        const stringValue = String(value).replace(/"/g, '""');
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
      // Reference tables (shared data)
      "factions",
      "games",
      "editions",
      "expansions",
      "paints",
      "bases",
      "base_shapes",
      "base_types",
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
      ];

      if (userTables.includes(table)) {
        query = query.eq("user_id", user.id);
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

export async function importDatabaseBackup(backupData: {
  [tableName: string]: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  try {
    // Define table order for import (respecting foreign key dependencies)
    // NOTE: We skip reference tables (factions, paints, games, editions, expansions)
    // as these are system-wide data that users shouldn't modify
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

    // Map paints by brand and name
    if (backupData.paints) {
      const backupPaints = parseCSV(backupData.paints);
      const { data: currentPaints } = await supabase.from("paints").select("id, brand, name");
      
      if (currentPaints) {
        const paintKeyMap = new Map(currentPaints.map((p) => [`${p.brand}:${p.name}`, p.id]));
        backupPaints.forEach((oldPaint) => {
          const key = `${oldPaint.brand}:${oldPaint.name}`;
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

    // Delete existing user data first
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
    ];

    for (const table of userTables) {
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
        if (userTables.includes(tableName) && processedRow.user_id) {
          processedRow.user_id = user.id;
        }

        // Map foreign keys for miniatures
        if (tableName === "miniatures") {
          if (processedRow.faction_id) {
            if (factionMapping[processedRow.faction_id] !== undefined) {
              processedRow.faction_id = factionMapping[processedRow.faction_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.faction_id = null;
            }
          }
          if (processedRow.base_id) {
            if (baseMapping[processedRow.base_id] !== undefined) {
              processedRow.base_id = baseMapping[processedRow.base_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.base_id = null;
            }
          }
          if (processedRow.base_shape_id) {
            if (baseShapeMapping[processedRow.base_shape_id] !== undefined) {
              processedRow.base_shape_id = baseShapeMapping[processedRow.base_shape_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.base_shape_id = null;
            }
          }
          if (processedRow.base_type_id) {
            if (baseTypeMapping[processedRow.base_type_id] !== undefined) {
              processedRow.base_type_id = baseTypeMapping[processedRow.base_type_id];
            } else {
              // If no mapping found, set to null to avoid FK violation
              processedRow.base_type_id = null;
            }
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

        return processedRow;
      });

      // Insert data in batches of 100 to avoid timeouts
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < processedRows.length; i += batchSize) {
        const batch = processedRows.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName).insert(batch);

        if (error) {
          console.error(`Error importing ${tableName} (batch ${i / batchSize + 1}):`, error);
          throw new Error(`Failed to import ${tableName}: ${error.message}`);
        }

        insertedCount += batch.length;
      }

      results[tableName] = insertedCount;
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
