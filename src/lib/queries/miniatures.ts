import { createClient } from "@/lib/supabase/server";

export async function getMiniatures(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("miniatures")
    .select(
      `
      *,
      faction:factions(*),
      status:miniature_status!miniature_id(*),
      photos:miniature_photos(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Ensure status is a single object, not an array for each miniature
  if (data) {
    data.forEach((miniature) => {
      if (Array.isArray(miniature.status)) {
        miniature.status = miniature.status[0] || null;
      }
    });
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
      status:miniature_status!miniature_id(*),
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

  console.log("getMiniatureById - status data:", {
    id,
    status: data.status,
    statusType: typeof data.status,
    statusIsArray: Array.isArray(data.status),
  });

  // Ensure status is a single object, not an array
  if (Array.isArray(data.status)) {
    data.status = data.status[0] || null;
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
