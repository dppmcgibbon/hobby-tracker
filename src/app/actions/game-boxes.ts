"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminSupabase() {
  await requireAuth();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }
  return await createClient();
}

export interface GameBoxInput {
  name: string;
  game_id: string;
  edition_id?: string | null;
  expansion_id?: string | null;
  box_type?: string;
  condition?: string | null;
  location?: string | null;
  barcode?: string | null;
  notes?: string | null;
}

export async function createGameBox(data: GameBoxInput) {
  const supabase = await getAdminSupabase();

  if (!data.name?.trim()) {
    throw new Error("Box name is required");
  }
  if (!data.game_id) {
    throw new Error("Game is required");
  }

  // Hierarchy validation
  if (data.expansion_id && !data.edition_id) {
    throw new Error("An edition must be specified if an expansion is selected");
  }

  const payload = {
    name: data.name.trim(),
    game_id: data.game_id,
    edition_id: data.edition_id || null,
    expansion_id: data.expansion_id || null,
    box_type: data.box_type?.trim() || "core",
    condition: data.condition?.trim() || "good",
    location: data.location?.trim() || null,
    barcode: data.barcode?.trim() || null,
    notes: data.notes?.trim() || null,
  };

  const { data: box, error } = await supabase.from("game_boxes").insert(payload).select().single();

  if (error) {
    throw new Error(`Failed to create game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, box };
}

export async function updateGameBox(id: string, data: Partial<GameBoxInput>) {
  const supabase = await getAdminSupabase();

  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error("Box name is required");
    payload.name = data.name.trim();
  }
  if (data.game_id !== undefined) payload.game_id = data.game_id;
  if (data.edition_id !== undefined) payload.edition_id = data.edition_id || null;
  if (data.expansion_id !== undefined) payload.expansion_id = data.expansion_id || null;
  if (data.box_type !== undefined) payload.box_type = data.box_type?.trim() || "core";
  if (data.condition !== undefined) payload.condition = data.condition?.trim() || null;
  if (data.location !== undefined) payload.location = data.location?.trim() || null;
  if (data.barcode !== undefined) payload.barcode = data.barcode?.trim() || null;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data: box, error } = await supabase
    .from("game_boxes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, box };
}

export async function deleteGameBox(id: string) {
  const supabase = await getAdminSupabase();

  // Find components with image_storage_path to clean up R2
  const { data: components } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("game_box_id", id);

  if (components) {
    const { deleteR2Object } = await import("@/lib/r2");
    for (const comp of components) {
      if (comp.image_storage_path) {
        try {
          await deleteR2Object(comp.image_storage_path);
        } catch (e) {
          console.warn("Failed to delete component image from R2:", e);
        }
      }
    }
  }

  const { error } = await supabase.from("game_boxes").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true };
}
