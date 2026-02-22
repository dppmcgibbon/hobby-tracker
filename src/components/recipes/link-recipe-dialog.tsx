"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { linkRecipeToMiniature } from "@/app/actions/recipes";
import { Plus, Search, BookOpen } from "lucide-react";
import type { PaintingRecipe } from "@/types";

interface RecipeWithRelations extends PaintingRecipe {
  id: string;
  name: string;
  faction?: { name: string } | null;
  steps?: Array<{ id: string }>;
}

interface LinkRecipeDialogProps {
  miniatureId: string;
  recipes: RecipeWithRelations[];
  linkedRecipeIds: string[];
}

export function LinkRecipeDialog({ miniatureId, recipes, linkedRecipeIds }: LinkRecipeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  const availableRecipes = recipes.filter((r) => !linkedRecipeIds.includes(r.id));

  const filteredRecipes = availableRecipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async (recipeId: string) => {
    setLinking(recipeId);
    try {
      await linkRecipeToMiniature(miniatureId, recipeId);
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error("Failed to link recipe:", error);
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Link Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Painting Recipe</DialogTitle>
          <DialogDescription>Select a recipe to link to this miniature</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No available recipes found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{recipe.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {recipe.faction && (
                        <span className="text-sm text-muted-foreground">{recipe.faction.name}</span>
                      )}
                      <Badge variant="outline">{recipe.steps?.length || 0} steps</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(recipe.id)}
                    disabled={linking === recipe.id}
                  >
                    {linking === recipe.id ? "Linking..." : "Link"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
