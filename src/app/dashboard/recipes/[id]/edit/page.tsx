import { requireAuth } from "@/lib/auth/server";
import { getRecipeById } from "@/lib/queries/recipes";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RecipeEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecipeEditPage({ params }: RecipeEditPageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const recipe = await getRecipeById(id, user.id);

  if (!recipe || recipe.user_id !== user.id) {
    redirect("/dashboard/recipes");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/recipes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Recipe</h1>
          <p className="text-muted-foreground">{recipe.name}</p>
        </div>
      </div>

      {/* TODO: Implement edit form similar to RecipeForm but with update functionality */}
      <div className="text-center py-12 bg-muted rounded-lg">
        <p className="text-muted-foreground">
          Recipe editing coming soon. For now, you can delete and recreate the recipe.
        </p>
      </div>
    </div>
  );
}
