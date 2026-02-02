import fs from "fs";
import csv from "csv-parser";
import { supabase, config } from "./config";

interface MiniatureRow {
  name: string;
  faction_name: string;
  unit_type: string;
  quantity: string;
  material: string;
  base_size: string;
  sculptor: string;
  year: string;
  notes: string;
}

async function importMiniatures(csvPath: string, userId: string) {
  console.log("Starting miniature import...");
  console.log(`Reading from: ${csvPath}`);
  console.log(`User ID: ${userId}`);

  // First, get all factions
  const { data: factions } = await supabase.from("factions").select("id, name");
  const factionMap = new Map(factions?.map((f) => [f.name, f.id]) || []);

  const miniatures: any[] = [];
  let skipped = 0;

  // Read CSV file
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row: MiniatureRow) => {
        // Validate data
        if (!row.name) {
          console.warn(`Skipping invalid row (no name):`, row);
          skipped++;
          return;
        }

        // Find faction ID
        const factionId = row.faction_name ? factionMap.get(row.faction_name.trim()) : null;

        if (row.faction_name && !factionId) {
          console.warn(`Unknown faction "${row.faction_name}" for ${row.name}`);
        }

        miniatures.push({
          user_id: userId,
          name: row.name.trim(),
          faction_id: factionId || null,
          unit_type: row.unit_type?.trim() || null,
          quantity: parseInt(row.quantity) || 1,
          material: row.material?.trim() || null,
          base_size: row.base_size?.trim() || null,
          sculptor: row.sculptor?.trim() || null,
          year: row.year ? parseInt(row.year) : null,
          notes: row.notes?.trim() || null,
        });
      })
      .on("end", async () => {
        console.log(`\nParsed ${miniatures.length} miniatures from CSV`);
        console.log(`Skipped ${skipped} invalid rows`);

        if (miniatures.length === 0) {
          console.log("No miniatures to import.");
          resolve();
          return;
        }

        console.log(`\nInserting ${miniatures.length} miniatures...`);

        // Insert in batches
        const batchSize = config.batchSize;
        let inserted = 0;
        let errors = 0;
        const insertedIds: string[] = [];

        for (let i = 0; i < miniatures.length; i += batchSize) {
          const batch = miniatures.slice(i, i + batchSize);

          const { data, error } = await supabase.from("miniatures").insert(batch).select();

          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            errors += batch.length;
          } else {
            inserted += batch.length;
            insertedIds.push(...(data?.map((m) => m.id) || []));
            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} miniatures`);
          }
        }

        // Create default status for all inserted miniatures
        if (insertedIds.length > 0) {
          console.log(`\nCreating status records for ${insertedIds.length} miniatures...`);

          const statusRecords = insertedIds.map((id) => ({
            miniature_id: id,
            user_id: userId,
            status: "backlog",
            magnetised: false,
            based: false,
          }));

          const { error: statusError } = await supabase
            .from("miniature_status")
            .insert(statusRecords);

          if (statusError) {
            console.error("Error creating status records:", statusError);
          } else {
            console.log("✅ Status records created");
          }
        }

        console.log(`\n✅ Import complete!`);
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Total models: ${miniatures.reduce((sum, m) => sum + m.quantity, 0)}`);

        resolve();
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Run the import
const csvPath = process.argv[2] || "./data/csv/miniatures.csv";
const userId = process.argv[3];

if (!userId) {
  console.error("Error: User ID is required");
  console.log("Usage: npm run migrate:miniatures <csv-path> <user-id>");
  process.exit(1);
}

importMiniatures(csvPath, userId)
  .then(() => {
    console.log("\nMiniature import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });