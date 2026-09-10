import { createClient } from "@/lib/supabase/server";

export async function getMiniatures(userId?: string) {
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
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Ensure status is a single object, not an array for each miniature, and sort photos by display_order
  if (data) {
    data.forEach((miniature) => {
      if (Array.isArray(miniature.status)) {
        miniature.status = miniature.status[0] || null;
      }
      if (Array.isArray(miniature.photos)) {
        miniature.photos.sort((a: any, b: any) => {
          const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
        });
      }
    });
  }

  return data;
}

export async function getMiniatureById(id: string, userId?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("miniatures")
    .select(
      `
      *,
      faction:factions(*),
      status:miniature_status!miniature_id(*),
      photos:miniature_photos(*),
      base:bases(id, name),
      base_shape:base_shapes(id, name),
      base_type:base_types(id, name),
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
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Ensure status is a single object, not an array
  if (Array.isArray(data.status)) {
    data.status = data.status[0] || null;
  }

  // Sort photos by display_order
  if (Array.isArray(data.photos)) {
    data.photos.sort((a: any, b: any) => {
      const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });
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

export async function getStorageBoxes(userId?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("storage_boxes")
    .select("*")
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

export async function getUniverses() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("universes")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
