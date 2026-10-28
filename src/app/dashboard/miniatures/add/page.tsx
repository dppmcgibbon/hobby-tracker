import { requireAuth } from "@/lib/auth/server";
import {
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

export default async function AddMiniaturePage() {
  const user = await requireAuth();
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Miniature</h1>
        <p className="text-muted-foreground">Add a new miniature to your collection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miniature Details</CardTitle>
          <CardDescription>
            Enter the details of your miniature. Only the name is required.
          </CardDescription>
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
