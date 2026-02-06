"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { miniatureSchema, miniatureStatusSchema } from "@/lib/validations/miniature";
import type { MiniatureInput, MiniatureStatusInput } from "@/lib/validations/miniature";

export async function createMiniature(data: MiniatureInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureSchema.parse(data);

  // Insert miniature
  const { data: miniature, error: miniatureError } = await supabase
    .from("miniatures")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single();

  if (miniatureError) {
    throw new Error(miniatureError.message);
  }

  // Create default status
  const { error: statusError } = await supabase.from("miniature_status").insert({
    miniature_id: miniature.id,
    user_id: user.id,
    status: "backlog",
    magnetised: false,
    based: false,
  });

  if (statusError) {
    throw new Error(statusError.message);
  }

  revalidatePath("/dashboard/collection");
  return { success: true, miniature };
}

export async function updateMiniature(id: string, data: MiniatureInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureSchema.parse(data);

  // Update miniature
  const { data: miniature, error } = await supabase
    .from("miniatures")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collection");
  revalidatePath(`/dashboard/collection/${id}`);
  return { success: true, miniature };
}

export async function deleteMiniature(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("miniatures").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collection");
  return { success: true };
}

export async function updateMiniatureStatus(miniatureId: string, data: MiniatureStatusInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureStatusSchema.parse(data);

  // Update status
  const { data: status, error } = await supabase
    .from("miniature_status")
    .update(validated)
    .eq("miniature_id", miniatureId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collection");
  revalidatePath(`/dashboard/collection/${miniatureId}`);
  return { success: true, status };
}

export async function bulkUpdateStatus(miniatureIds: string[], status: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify all miniatures belong to user
  const { data: miniatures } = await supabase
    .from("miniatures")
    .select("id")
    .in("id", miniatureIds)
    .eq("user_id", user.id);

  if (!miniatures || miniatures.length !== miniatureIds.length) {
    throw new Error("Some miniatures not found or access denied");
  }

  // Update status in miniature_status table
  const { error } = await supabase
    .from("miniature_status")
    .update({ status })
    .in("miniature_id", miniatureIds)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collection");
  return { success: true };
}

export async function bulkDelete(miniatureIds: string[]) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify all miniatures belong to user
  const { data: miniatures } = await supabase
    .from("miniatures")
    .select("id")
    .in("id", miniatureIds)
    .eq("user_id", user.id);

  if (!miniatures || miniatures.length !== miniatureIds.length) {
    throw new Error("Some miniatures not found or access denied");
  }

  const { error } = await supabase.from("miniatures").delete().in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collection");
  return { success: true };
}

export async function getMiniaturesExcludingCollection(collectionId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get all miniatures not in the specified collection
  const { data: miniatures, error } = await supabase
    .from("miniatures")
    .select(
      `
      id,
      name,
      factions!inner (name)
    `
    )
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Get miniatures already in the collection
  const { data: collectionMiniatures } = await supabase
    .from("collection_miniatures")
    .select("miniature_id")
    .eq("collection_id", collectionId);

  const collectionMiniatureIds = new Set(collectionMiniatures?.map((cm) => cm.miniature_id) || []);

  // Filter out miniatures already in the collection and transform the data
  const availableMiniatures = (miniatures || [])
    .filter((m) => !collectionMiniatureIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      factions: Array.isArray(m.factions) ? m.factions[0] : m.factions,
    }));

  return { success: true, miniatures: availableMiniatures };
}

export async function duplicateMiniature(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get the original miniature
  const { data: original, error: fetchError } = await supabase
    .from("miniatures")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    throw new Error("Miniature not found");
  }

  // Get the original status
  const { data: originalStatus } = await supabase
    .from("miniature_status")
    .select("*")
    .eq("miniature_id", id)
    .eq("user_id", user.id)
    .single();

  // Get the original game links
  const { data: originalGames } = await supabase
    .from("miniature_games")
    .select("*")
    .eq("miniature_id", id);

  // Create duplicate with modified name
  const { id: _, user_id: __, created_at: ___, updated_at: ____, ...miniatureData } = original;
  
  const { data: duplicate, error: createError } = await supabase
    .from("miniatures")
    .insert({
      ...miniatureData,
      name: `${original.name} (Copy)`,
      user_id: user.id,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  // Create status for duplicate (copy status but reset completion date)
  const { error: statusError } = await supabase.from("miniature_status").insert({
    miniature_id: duplicate.id,
    user_id: user.id,
    status: originalStatus?.status || "backlog",
    magnetised: originalStatus?.magnetised || false,
    based: originalStatus?.based || false,
  });

  if (statusError) {
    throw new Error(statusError.message);
  }

  // Copy game links if any exist
  if (originalGames && originalGames.length > 0) {
    const gameLinks = originalGames.map((link) => ({
      miniature_id: duplicate.id,
      game_id: link.game_id,
      edition_id: link.edition_id,
      expansion_id: link.expansion_id,
    }));

    const { error: gamesError } = await supabase
      .from("miniature_games")
      .insert(gameLinks);

    if (gamesError) {
      console.error("Error copying game links:", gamesError);
      // Don't throw - we still want the duplicate to succeed even if game links fail
    }
  }

  revalidatePath("/dashboard/collection");
  return { success: true, miniature: duplicate };
}
