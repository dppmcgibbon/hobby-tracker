import { supabase } from "./config";

async function verify() {
  console.log("Verifying database...\n");

  // Check factions
  const { count: factionCount } = await supabase
    .from("factions")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Factions: ${factionCount} records`);

  // Check paints
  const { count: paintCount } = await supabase
    .from("paints")
    .select("*", { count: "exact", head: true });

  const { data: paintsByType } = await supabase.from("paints").select("type").order("type");

  const typeBreakdown = paintsByType?.reduce(
    (acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`✅ Paints: ${paintCount} records`);
  if (typeBreakdown) {
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  // Check miniatures
  const { count: miniatureCount } = await supabase
    .from("miniatures")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Miniatures: ${miniatureCount} records`);

  // Check status records
  const { count: statusCount } = await supabase
    .from("miniature_status")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Miniature Status: ${statusCount} records`);

  if (miniatureCount !== statusCount) {
    console.warn(
      `⚠️  Warning: Miniature count (${miniatureCount}) doesn't match status count (${statusCount})`
    );
  }

  // Check photos
  const { count: photoCount } = await supabase
    .from("miniature_photos")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Photos: ${photoCount} records`);

  // Check recipes
  const { count: recipeCount } = await supabase
    .from("painting_recipes")
    .select("*", { count: "exact", head: true });

  console.log(`✅ Recipes: ${recipeCount} records`);

  // Check user paints
  const { count: userPaintCount } = await supabase
    .from("user_paints")
    .select("*", { count: "exact", head: true });

  console.log(`✅ User Paints: ${userPaintCount} records`);

  console.log("\n✅ Verification complete!");
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
