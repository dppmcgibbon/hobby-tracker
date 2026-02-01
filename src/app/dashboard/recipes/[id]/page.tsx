import { requireAuth } from "@/lib/auth/server";
import { getRecipeById } from "@/lib/queries/recipes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteRecipe } from "@/app/actions/recipes";
import { Edit2, Trash2, ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RecipeStepDisplay } from "@/components/recipes/recipe-step-display";

interface RecipeDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const recipe = await getRecipeById(id, user.id);

  if (!recipe) {
    redirect("/dashboard/recipes");
  }

  const isOwner = recipe.user_id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/recipes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold">{recipe.name}</h1>
            {recipe.is_public && (
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            )}
          </div>
          {recipe.faction && <p className="text-muted-foreground">{recipe.faction.name}</p>}
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/recipes/${id}/edit`}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this recipe? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <form
                    action={async () => {
                      "use server";
                      await deleteRecipe(id);
                      redirect("/dashboard/recipes");
                    }}
                  >
                    <AlertDialogAction type="submit">Delete</AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {recipe.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{recipe.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Painting Steps ({recipe.steps?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.steps && recipe.steps.length > 0 ? (
            <div className="space-y-4">
              {recipe.steps
                .sort((a, b) => a.step_order - b.step_order)
                .map((step, index) => (
                  <div key={step.id}>
                    <RecipeStepDisplay step={step} stepNumber={index + 1} />
                    {index < recipe.steps.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No steps added to this recipe yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
