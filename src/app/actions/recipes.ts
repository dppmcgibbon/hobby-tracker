"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { recipeSchema, createRecipeWithStepsSchema } from "@/lib/validations/recipe";
import type { RecipeInput, CreateRecipeWithStepsInput } from "@/lib/validations/recipe";

export async function createRecipe(data: CreateRecipeWithStepsInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = createRecipeWithStepsSchema.parse(data);

  // Create recipe
  const { data: recipe, error: recipeError } = await supabase
    .from("painting_recipes")
    .insert({
      ...validated.recipe,
      user_id: user.id,
    })
    .select()
    .single();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  // Create steps
  const steps = validated.steps.map((step, index) => ({
    recipe_id: recipe.id,
    step_order: index + 1,
    paint_id: step.paint_id,
    technique: step.technique,
    notes: step.notes,
  }));

  const { error: stepsError } = await supabase.from("recipe_steps").insert(steps);

  if (stepsError) {
    // Rollback: delete recipe
    await supabase.from("painting_recipes").delete().eq("id", recipe.id);
    throw new Error(stepsError.message);
  }

  revalidatePath("/dashboard/recipes");
  return { success: true, recipe };
}

export async function updateRecipe(id: string, data: RecipeInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = recipeSchema.parse(data);

  const { data: recipe, error } = await supabase
    .from("painting_recipes")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/recipes");
  revalidatePath(`/dashboard/recipes/${id}`);
  return { success: true, recipe };
}

export async function deleteRecipe(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("painting_recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/recipes");
  return { success: true };
}

export async function addRecipeStep(
  recipeId: string,
  step: { paint_id?: string; technique: string; notes?: string }
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: recipe } = await supabase
    .from("painting_recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .single();

  if (!recipe) {
    throw new Error("Recipe not found or access denied");
  }

  // Get max step order
  const { data: steps } = await supabase
    .from("recipe_steps")
    .select("step_order")
    .eq("recipe_id", recipeId)
    .order("step_order", { ascending: false })
    .limit(1);

  const nextOrder = steps && steps.length > 0 ? steps[0].step_order + 1 : 1;

  const { data: newStep, error } = await supabase
    .from("recipe_steps")
    .insert({
      recipe_id: recipeId,
      step_order: nextOrder,
      ...step,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/recipes/${recipeId}`);
  return { success: true, step: newStep };
}

export async function deleteRecipeStep(stepId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get step to verify ownership
  const { data: step } = await supabase
    .from("recipe_steps")
    .select("recipe_id, painting_recipes!inner(user_id)")
    .eq("id", stepId)
    .single();

  // Type guard to handle the array type from Supabase
  const paintingRecipes = step?.painting_recipes as
    | { user_id: string }
    | { user_id: string }[]
    | undefined;
  const recipeUserId = Array.isArray(paintingRecipes)
    ? paintingRecipes[0]?.user_id
    : paintingRecipes?.user_id;

  if (!step || recipeUserId !== user.id) {
    throw new Error("Step not found or access denied");
  }

  const { error } = await supabase.from("recipe_steps").delete().eq("id", stepId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/recipes/${step.recipe_id}`);
  return { success: true };
}

export async function linkRecipeToMiniature(miniatureId: string, recipeId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify miniature ownership
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found or access denied");
  }

  const { error } = await supabase.from("miniature_recipes").insert({
    miniature_id: miniatureId,
    recipe_id: recipeId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${miniatureId}`);
  revalidatePath(`/dashboard/recipes/${recipeId}`);
  return { success: true };
}

export async function unlinkRecipeFromMiniature(miniatureId: string, recipeId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify miniature ownership
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found or access denied");
  }

  const { error } = await supabase
    .from("miniature_recipes")
    .delete()
    .eq("miniature_id", miniatureId)
    .eq("recipe_id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${miniatureId}`);
  revalidatePath(`/dashboard/recipes/${recipeId}`);
  return { success: true };
}
