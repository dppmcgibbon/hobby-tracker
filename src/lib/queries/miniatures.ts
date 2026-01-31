import { createClient } from "@/lib/supabase/server";

export async function getMiniatures(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("miniatures")
    .select(
      `
      *,
      faction:factions(*),
      status:miniature_status(*),
      photos:miniature_photos(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getMiniatureById(id: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("miniatures")
    .select(
      `
      *,
      faction:factions(*),
      status:miniature_status(*),
      photos:miniature_photos(*),
      recipes:miniature_recipes(
        recipe:painting_recipes(
          *,
          steps:recipe_steps(
            *,
            paint:paints(*)
          )
        )
      )
    `
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getFactions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("factions")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
