import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import {
  getMiniatureById,
  getFactions,
  getStorageBoxes,
  getBases,
  getBaseShapes,
  getBaseTypes,
  getMiniatureStatuses,
} from "@/lib/queries/miniatures";
import { getRecipes } from "@/lib/queries/recipes";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniatureForm } from "@/components/miniatures/miniature-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMiniaturePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  let miniature;
  try {
    miniature = await getMiniatureById(id, user.id);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const [factions, storageBoxes, recipes, bases, baseShapes, baseTypes, statusRows, { data: gameBoxes }] =
    await Promise.all([
      getFactions(),
      getStorageBoxes(user.id),
      getRecipes(user.id),
      getBases(),
      getBaseShapes(),
      getBaseTypes(),
      getMiniatureStatuses(),
      supabase
        .from("game_boxes")
        .select("id, name, location, game_id, game:games(name)")
        .order("name"),
    ]);

  // Get existing recipe links
  const { data: miniatureRecipes } = await supabase
    .from("miniature_recipes")
    .select("recipe_id")
    .eq("miniature_id", id);

  const existingRecipeIds = miniatureRecipes?.map((mr) => mr.recipe_id) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Miniature</h1>
        <p className="text-muted-foreground">Update the details of {miniature.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miniature Details</CardTitle>
          <CardDescription>Make changes to your miniature information.</CardDescription>
        </CardHeader>
        <CardContent>
          <MiniatureForm
            factions={factions}
            statusRows={statusRows.map((r) => ({ name: r.name, display_order: r.display_order }))}
            storageBoxes={storageBoxes}
            recipes={recipes}
            bases={bases}
            baseShapes={baseShapes}
            baseTypes={baseTypes}
            gameBoxes={(gameBoxes as any) || []}
            existingRecipeIds={existingRecipeIds}
            miniature={miniature}
          />
        </CardContent>
      </Card>
    </div>
  );
}
