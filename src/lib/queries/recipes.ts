import { createClient } from "@/lib/supabase/server";

export async function getRecipes(userId?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("painting_recipes")
    .select(
      `
      *,
      faction:factions(*),
      steps:recipe_steps(
        *,
        paint:paints(*)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getRecipeById(id: string, userId?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("painting_recipes")
    .select(
      `
      *,
      faction:factions(*),
      steps:recipe_steps(
        *,
        paint:paints(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getPublicRecipes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("painting_recipes")
    .select(
      `
      *,
      faction:factions(*),
      steps:recipe_steps(
        *,
        paint:paints(*)
      )
    `
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
