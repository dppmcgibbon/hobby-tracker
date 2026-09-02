import fs from "fs";
import { supabase } from "./config";

async function fetchAllRows(query: any): Promise<any[]> {
  const allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const { data, error } = await query.range(start, end);
    if (error) throw error;
    if (data && data.length > 0) {
      allRows.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  return allRows;
}

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `./backups/${timestamp}`;

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Creating backup in: ${backupDir}\n`);

  // Backup factions
  const factions = await fetchAllRows(supabase.from("factions").select("*").order("id", { ascending: true }));
  fs.writeFileSync(`${backupDir}/factions.json`, JSON.stringify(factions, null, 2));
  console.log(`✅ Backed up ${factions?.length || 0} factions`);

  // Backup paints
  const paints = await fetchAllRows(supabase.from("paints").select("*").order("id", { ascending: true }));
  fs.writeFileSync(`${backupDir}/paints.json`, JSON.stringify(paints, null, 2));
  console.log(`✅ Backed up ${paints?.length || 0} paints`);

  // Backup miniatures (all users)
  const miniatures = await fetchAllRows(supabase.from("miniatures").select("*").order("id", { ascending: true }));
  fs.writeFileSync(`${backupDir}/miniatures.json`, JSON.stringify(miniatures, null, 2));
  console.log(`✅ Backed up ${miniatures?.length || 0} miniatures`);

  // Backup recipes
  const recipes = await fetchAllRows(supabase.from("painting_recipes").select("*").order("id", { ascending: true }));
  fs.writeFileSync(`${backupDir}/recipes.json`, JSON.stringify(recipes, null, 2));
  console.log(`✅ Backed up ${recipes?.length || 0} recipes`);

  console.log(`\n✅ Backup complete!`);
  console.log(`Location: ${backupDir}`);
}

backup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backup failed:", error);
    process.exit(1);
  });
