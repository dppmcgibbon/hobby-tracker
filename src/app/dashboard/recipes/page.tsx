import { requireAuth } from "@/lib/auth/server";

export default async function RecipesPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Painting Recipes</h1>
      <p className="text-muted-foreground">Your painting recipes will appear here.</p>
    </div>
  );
}