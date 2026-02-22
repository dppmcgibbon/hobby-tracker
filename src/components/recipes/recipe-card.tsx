import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Layers } from "lucide-react";
import type { PaintingRecipe } from "@/types";

interface RecipeWithRelations extends Omit<PaintingRecipe, "description" | "is_public"> {
  id: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  faction?: { name: string } | null;
  steps?: Array<{ id: string }>;
}

interface RecipeCardProps {
  recipe: RecipeWithRelations;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const stepCount = recipe.steps?.length || 0;

  return (
    <Link href={`/dashboard/recipes/${recipe.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">{recipe.name}</h3>
              {recipe.faction && (
                <p className="text-sm text-muted-foreground mt-1">{recipe.faction.name}</p>
              )}
            </div>
            <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>

        {recipe.description && (
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
          </CardContent>
        )}

        <CardFooter className="flex items-center justify-between pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>
              {stepCount} step{stepCount !== 1 ? "s" : ""}
            </span>
          </div>
          {recipe.is_public && <Badge variant="outline">Public</Badge>}
        </CardFooter>
      </Card>
    </Link>
  );
}
