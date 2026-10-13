"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uploadR2Object, deleteR2Object } from "@/lib/r2";

async function getAdminSupabase() {
  await requireAuth();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }
  return await createClient();
}

export interface GameComponentInput {
  game_box_id: string;
  name: string;
  component_type?: string;
  quantity_expected?: number;
  quantity_actual?: number;
  status?: string;
  description?: string | null;
  notes?: string | null;
}

export async function createGameComponent(data: GameComponentInput) {
  const supabase = await getAdminSupabase();

  if (!data.name?.trim()) {
    throw new Error("Component name is required");
  }
  if (!data.game_box_id) {
    throw new Error("Game box is required");
  }

  const payload = {
    game_box_id: data.game_box_id,
    name: data.name.trim(),
    component_type: data.component_type?.trim() || "other",
    quantity_expected:
      typeof data.quantity_expected === "number" ? Math.max(1, data.quantity_expected) : 1,
    quantity_actual:
      typeof data.quantity_actual === "number" ? Math.max(0, data.quantity_actual) : 1,
    status: data.status?.trim() || "complete",
    description: data.description?.trim() || null,
    notes: data.notes?.trim() || null,
  };

  const { data: component, error } = await supabase
    .from("game_components")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, component };
}

export async function updateGameComponent(id: string, data: Partial<GameComponentInput>) {
  const supabase = await getAdminSupabase();

  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error("Component name is required");
    payload.name = data.name.trim();
  }
  if (data.game_box_id !== undefined) payload.game_box_id = data.game_box_id;
  if (data.component_type !== undefined)
    payload.component_type = data.component_type.trim() || "other";
  if (data.quantity_expected !== undefined)
    payload.quantity_expected = Math.max(1, data.quantity_expected);
  if (data.quantity_actual !== undefined)
    payload.quantity_actual = Math.max(0, data.quantity_actual);
  if (data.status !== undefined) payload.status = data.status.trim() || "complete";
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data: component, error } = await supabase
    .from("game_components")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, component };
}

export async function deleteGameComponent(id: string) {
  const supabase = await getAdminSupabase();

  // Clean up any R2 image
  const { data: current } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", id)
    .single();

  if (current?.image_storage_path) {
    try {
      await deleteR2Object(current.image_storage_path);
    } catch (e) {
      console.warn("Failed to delete component image from R2:", e);
    }
  }

  const { error } = await supabase.from("game_components").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true };
}

export async function uploadComponentImage(componentId: string, formData: FormData) {
  const supabase = await getAdminSupabase();

  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No image file provided.");
  }

  // Get current component to check if old image should be deleted
  const { data: current, error: fetchErr } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (fetchErr || !current) {
    throw new Error("Component not found");
  }

  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `components/${componentId}/${timestamp}-${cleanFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { key: storagePath } = await uploadR2Object(key, buffer, file.type || "image/jpeg");

  // Delete previous image if existed
  if (current.image_storage_path && current.image_storage_path !== storagePath) {
    try {
      await deleteR2Object(current.image_storage_path);
    } catch (e) {
      console.warn("Failed to delete old image from R2:", e);
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("game_components")
    .update({
      image_storage_path: storagePath,
      image_updated_at: now,
      updated_at: now,
    })
    .eq("id", componentId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Failed to update component with image: ${updateErr.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true, component: updated };
}

export async function replaceComponentImageWithBuffer(componentId: string, formData: FormData) {
  const supabase = await getAdminSupabase();

  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No image file provided.");
  }

  const { data: current, error: fetchErr } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (fetchErr || !current) {
    throw new Error("Component not found");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // If storage path exists, upload to it (or create new timestamped key)
  const timestamp = Date.now();
  const storagePath =
    current.image_storage_path || `components/${componentId}/${timestamp}-edited.png`;

  await uploadR2Object(storagePath, buffer, file.type || "image/png");

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("game_components")
    .update({
      image_storage_path: storagePath,
      image_updated_at: now,
      updated_at: now,
    })
    .eq("id", componentId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Failed to save edited component image: ${updateErr.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true, component: updated };
}

export async function deleteComponentImage(componentId: string) {
  const supabase = await getAdminSupabase();

  const { data: current, error: fetchErr } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (fetchErr || !current) {
    throw new Error("Component not found");
  }

  if (current.image_storage_path) {
    try {
      await deleteR2Object(current.image_storage_path);
    } catch (e) {
      console.warn("Failed to delete component image from R2:", e);
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("game_components")
    .update({
      image_storage_path: null,
      image_updated_at: now,
      updated_at: now,
    })
    .eq("id", componentId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(`Failed to clear component image: ${updateErr.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true, component: updated };
}
