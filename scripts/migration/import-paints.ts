import fs from "fs";
import csv from "csv-parser";
import { supabase, config } from "./config";

interface PaintRow {
  brand: string;
  name: string;
  type: string;
  color_hex: string;
}

async function importPaints(csvPath: string) {
  console.log("Starting paint import...");
  console.log(`Reading from: ${csvPath}`);

  const paints: PaintRow[] = [];
  const validTypes = ["base", "layer", "shade", "dry", "technical", "contrast", "air", "spray"];

  // Read CSV file
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row: PaintRow) => {
        // Validate data
        if (!row.brand || !row.name || !row.type) {
          console.warn(`Skipping invalid row:`, row);
          return;
        }

        const type = row.type.trim().toLowerCase();
        if (!validTypes.includes(type)) {
          console.warn(`Invalid paint type "${type}" for ${row.name}`);
          return;
        }

        paints.push({
          brand: row.brand.trim(),
          name: row.name.trim(),
          type: type,
          color_hex: row.color_hex?.trim() || null,
        });
      })
      .on("end", async () => {
        console.log(`\nParsed ${paints.length} paints from CSV`);

        // Check existing paints
        const { data: existing } = await supabase.from("paints").select("brand, name");
        const existingKeys = new Set(existing?.map((p) => `${p.brand}|${p.name}`) || []);

        // Filter out duplicates
        const toInsert = paints.filter((p) => !existingKeys.has(`${p.brand}|${p.name}`));

        if (toInsert.length === 0) {
          console.log("All paints already exist. No import needed.");
          resolve();
          return;
        }

        console.log(`\nInserting ${toInsert.length} new paints...`);

        // Insert in batches
        const batchSize = config.batchSize;
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);

          const { error } = await supabase.from("paints").insert(batch).select();

          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            errors += batch.length;
          } else {
            inserted += batch.length;
            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} paints`);
          }
        }

        // Print summary by type
        const byType = toInsert.reduce(
          (acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        console.log(`\n✅ Import complete!`);
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Skipped (duplicates): ${paints.length - toInsert.length}`);
        console.log(`\nPaints by type:`);
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });

        resolve();
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Run the import
const csvPath = process.argv[2] || "./data/csv/paints.csv";
importPaints(csvPath)
  .then(() => {
    console.log("\nPaint import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
