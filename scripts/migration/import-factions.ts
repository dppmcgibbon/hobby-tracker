import fs from "fs";
import csv from "csv-parser";
import { supabase, config } from "./config";

interface FactionRow {
  name: string;
  army_type: string;
  description: string;
  color_hex: string;
}

async function importFactions(csvPath: string) {
  console.log("Starting faction import...");
  console.log(`Reading from: ${csvPath}`);

  const factions: FactionRow[] = [];

  // Read CSV file
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row: FactionRow) => {
        // Validate data
        if (!row.name || !row.army_type) {
          console.warn(`Skipping invalid row:`, row);
          return;
        }

        factions.push({
          name: row.name.trim(),
          army_type: row.army_type.trim(),
          description: row.description?.trim() || null,
          color_hex: row.color_hex?.trim() || null,
        });
      })
      .on("end", async () => {
        console.log(`\nParsed ${factions.length} factions from CSV`);

        // Check existing factions
        const { data: existing } = await supabase.from("factions").select("name");
        const existingNames = new Set(existing?.map((f) => f.name) || []);

        // Filter out duplicates
        const toInsert = factions.filter((f) => !existingNames.has(f.name));

        if (toInsert.length === 0) {
          console.log("All factions already exist. No import needed.");
          resolve();
          return;
        }

        console.log(`\nInserting ${toInsert.length} new factions...`);

        // Insert in batches
        const batchSize = config.batchSize;
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);

          const { error } = await supabase.from("factions").insert(batch).select();

          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            errors += batch.length;
          } else {
            inserted += batch.length;
            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} factions`);
          }
        }

        console.log(`\n✅ Import complete!`);
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Skipped (duplicates): ${factions.length - toInsert.length}`);

        resolve();
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Run the import
const csvPath = process.argv[2] || "./data/csv/factions.csv";
importFactions(csvPath)
  .then(() => {
    console.log("\nFaction import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
