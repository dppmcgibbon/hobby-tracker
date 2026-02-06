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

  // Fetch storage box separately if storage_box_id exists
  if (data.storage_box_id) {
    const { data: storageBox } = await supabase
      .from("storage_boxes")
      .select("*")
      .eq("id", data.storage_box_id)
      .single();
    
    if (storageBox) {
      data.storage_box = storageBox;
    }
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

export async function getStorageBoxes(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getBases() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bases")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getBaseShapes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("base_shapes")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getBaseTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("base_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getMiniatureStatuses() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("miniature_statuses")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
