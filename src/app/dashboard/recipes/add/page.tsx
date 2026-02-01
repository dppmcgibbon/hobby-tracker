import { requireAuth } from "@/lib/auth/server";
import { getAllPaints } from "@/lib/queries/paints";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function AddRecipePage() {
  await requireAuth();
  const supabase = await createClient();

  const [paints, factionsResult] = await Promise.all([
    getAllPaints(),
    supabase.from("factions").select("*").order("name", { ascending: true }),
  ]);

  const factions = factionsResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Painting Recipe</h1>
        <p className="text-muted-foreground">Build a step-by-step guide for your color scheme</p>
      </div>

      <RecipeForm paints={paints} factions={factions} />
    </div>
  );
}
