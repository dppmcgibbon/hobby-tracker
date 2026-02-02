import fs from "fs";
import { supabase } from "./config";

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `./backups/${timestamp}`;

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Creating backup in: ${backupDir}\n`);

  // Backup factions
  const { data: factions } = await supabase.from("factions").select("*");
  fs.writeFileSync(`${backupDir}/factions.json`, JSON.stringify(factions, null, 2));
  console.log(`✅ Backed up ${factions?.length || 0} factions`);

  // Backup paints
  const { data: paints } = await supabase.from("paints").select("*");
  fs.writeFileSync(`${backupDir}/paints.json`, JSON.stringify(paints, null, 2));
  console.log(`✅ Backed up ${paints?.length || 0} paints`);

  // Backup miniatures (all users)
  const { data: miniatures } = await supabase.from("miniatures").select("*");
  fs.writeFileSync(`${backupDir}/miniatures.json`, JSON.stringify(miniatures, null, 2));
  console.log(`✅ Backed up ${miniatures?.length || 0} miniatures`);

  // Backup recipes
  const { data: recipes } = await supabase.from("painting_recipes").select("*");
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
