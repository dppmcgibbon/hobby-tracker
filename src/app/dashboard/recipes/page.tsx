import { requireAuth } from "@/lib/auth/server";
import { getRecipes } from "@/lib/queries/recipes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { RecipeCard } from "@/components/recipes/recipe-card";

export default async function RecipesPage() {
  const user = await requireAuth();
  const recipes = await getRecipes(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painting Recipes</h1>
          <p className="text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recipes/add">
            <Plus className="mr-2 h-4 w-4" />
            Create Recipe
          </Link>
        </Button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No recipes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first painting recipe to track your color schemes
          </p>
          <Button asChild>
            <Link href="/dashboard/recipes/add">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Recipe
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
