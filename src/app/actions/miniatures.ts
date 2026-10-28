"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { miniatureSchema, miniatureStatusSchema } from "@/lib/validations/miniature";
import type { MiniatureInput, MiniatureStatusInput } from "@/lib/validations/miniature";
import { copyR2Object } from "@/lib/r2";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

async function assertMiniatureStatusNameValid(supabase: ServerSupabase, status: string) {
  const { data, error } = await supabase
    .from("miniature_statuses")
    .select("name")
    .eq("name", status)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(
      `Invalid status "${status}". Add it to miniature_statuses or pick an existing status.`
    );
  }
}

export async function createMiniature(data: MiniatureInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureSchema.parse(data);
  const { status: statusVal, magnetised: magnetisedVal, based: basedVal, ...miniatureData } = validated;

  // Insert miniature (omit status fields; they go to miniature_status)
  const { data: miniature, error: miniatureError } = await supabase
    .from("miniatures")
    .insert(miniatureData)
    .select()
    .single();

  if (miniatureError) {
    throw new Error(miniatureError.message);
  }

  const resolvedStatus = statusVal ?? "backlog";
  await assertMiniatureStatusNameValid(supabase, resolvedStatus);

  // Create status row (use form values when provided)
  const { error: statusError } = await supabase.from("miniature_status").insert({
    miniature_id: miniature.id,
    status: resolvedStatus,
    magnetised: magnetisedVal ?? false,
    based: basedVal ?? false,
  });

  if (statusError) {
    throw new Error(statusError.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  return { success: true, miniature };
}

export async function updateMiniature(id: string, data: MiniatureInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureSchema.parse(data);
  const { status: statusVal, magnetised: magnetisedVal, based: basedVal, ...miniatureData } = validated;

  // Update miniature (omit status fields)
  const { data: miniature, error } = await supabase
    .from("miniatures")
    .update(miniatureData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Update status row when status fields are provided
  if (statusVal !== undefined || magnetisedVal !== undefined || basedVal !== undefined) {
    if (statusVal !== undefined) {
      await assertMiniatureStatusNameValid(supabase, statusVal);
    }
    const statusUpdate = {
      ...(statusVal !== undefined && { status: statusVal }),
      ...(magnetisedVal !== undefined && { magnetised: magnetisedVal }),
      ...(basedVal !== undefined && { based: basedVal }),
    };
    if (Object.keys(statusUpdate).length > 0) {
      await supabase
        .from("miniature_status")
        .update(statusUpdate)
        .eq("miniature_id", id);
    }
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  revalidatePath(`/dashboard/miniatures/${id}`);
  return { success: true, miniature };
}

export async function deleteMiniature(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("miniatures").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function updateMiniatureStatus(miniatureId: string, data: MiniatureStatusInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = miniatureStatusSchema.parse(data);
  await assertMiniatureStatusNameValid(supabase, validated.status);

  // Update status
  const { data: status, error } = await supabase
    .from("miniature_status")
    .update(validated)
    .eq("miniature_id", miniatureId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true, status };
}

export async function bulkUpdateStatus(miniatureIds: string[], status: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  await assertMiniatureStatusNameValid(supabase, status);

  // Update status in miniature_status table
  const { error } = await supabase
    .from("miniature_status")
    .update({ status })
    .in("miniature_id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkUpdateStorageBox(miniatureIds: string[], storageBoxId: string | null) {
  const user = await requireAuth();
  const supabase = await createClient();

  // If storageBoxId is provided, verify it exists
  if (storageBoxId) {
    const { data: storageBox } = await supabase
      .from("storage_boxes")
      .select("id")
      .eq("id", storageBoxId)
      .single();

    if (!storageBox) {
      throw new Error("Storage box not found");
    }
  }

  // Update storage_box_id in miniatures table
  const { error } = await supabase
    .from("miniatures")
    .update({ storage_box_id: storageBoxId })
    .in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkUpdateGameBox(miniatureIds: string[], gameBoxId: string | null) {
  const user = await requireAuth();
  const supabase = await createClient();

  // If gameBoxId is provided, verify it exists
  if (gameBoxId) {
    const { data: gameBox } = await supabase
      .from("game_boxes")
      .select("id")
      .eq("id", gameBoxId)
      .single();

    if (!gameBox) {
      throw new Error("Game box not found");
    }
  }

  // Update game_box_id in miniatures table
  const { error } = await supabase
    .from("miniatures")
    .update({ game_box_id: gameBoxId })
    .in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkUpdateFaction(miniatureIds: string[], factionId: string | null) {
  const user = await requireAuth();
  const supabase = await createClient();

  // If factionId is provided, verify it exists
  if (factionId) {
    const { data: faction } = await supabase
      .from("factions")
      .select("id")
      .eq("id", factionId)
      .single();

    if (!faction) {
      throw new Error("Faction not found");
    }
  }

  // Update faction_id in miniatures table
  const { error } = await supabase
    .from("miniatures")
    .update({ faction_id: factionId })
    .in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkUpdateBases(
  miniatureIds: string[],
  baseId: string | null,
  baseShapeId: string | null,
  baseTypeId: string | null
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Update base fields in miniatures table
  const { error } = await supabase
    .from("miniatures")
    .update({
      base_id: baseId,
      base_shape_id: baseShapeId,
      base_type_id: baseTypeId,
    })
    .in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkUpdateMetadata(
  miniatureIds: string[],
  year: number | null,
  material: string | null,
  sculptor: string | null
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Build update object with only provided fields
  const updateData: Record<string, number | string | null> = {};
  if (year !== undefined) updateData.year = year;
  if (material !== undefined) updateData.material = material;
  if (sculptor !== undefined) updateData.sculptor = sculptor;

  // Update metadata fields in miniatures table
  const { error } = await supabase
    .from("miniatures")
    .update(updateData)
    .in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkAppendNotes(miniatureIds: string[], notesToAppend: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const trimmedAppend = notesToAppend.trim();
  if (!trimmedAppend) {
    throw new Error("Note content cannot be empty");
  }

  const uniqueIds = Array.from(new Set(miniatureIds));
  if (uniqueIds.length === 0) {
    return { success: true };
  }

  // Fetch current notes for the selected miniatures
  const { data: miniatures, error: fetchError } = await supabase
    .from("miniatures")
    .select("id, notes")
    .in("id", uniqueIds);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // Update each miniature with appended notes
  const updates = (miniatures || []).map((m) => {
    const existingNotes = m.notes?.trim() || "";
    const newNotes = existingNotes ? `${existingNotes}\n${trimmedAppend}` : trimmedAppend;
    return supabase
      .from("miniatures")
      .update({ notes: newNotes })
      .eq("id", m.id);
  });

  const results = await Promise.all(updates);
  const updateError = results.find((r) => r.error);
  if (updateError && updateError.error) {
    throw new Error(updateError.error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkClearNotes(miniatureIds: string[]) {
  const user = await requireAuth();
  const supabase = await createClient();

  const uniqueIds = Array.from(new Set(miniatureIds));
  if (uniqueIds.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("miniatures")
    .update({ notes: null })
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkDelete(miniatureIds: string[]) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("miniatures").delete().in("id", miniatureIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/miniatures");
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

export async function duplicateMiniature(id: string, options?: { copyImages?: boolean }) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get the original miniature
  const { data: original, error: fetchError } = await supabase
    .from("miniatures")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    throw new Error("Miniature not found");
  }

  // Get the original status
  const { data: originalStatus } = await supabase
    .from("miniature_status")
    .select("*")
    .eq("miniature_id", id)
    .single();

  // Get the original game links
  const { data: originalGames } = await supabase
    .from("miniature_games")
    .select("*")
    .eq("miniature_id", id);

  // Get the original recipe links
  const { data: originalRecipes } = await supabase
    .from("miniature_recipes")
    .select("recipe_id")
    .eq("miniature_id", id);

  // Get original photos if copyImages is requested
  const { data: originalPhotos } = options?.copyImages
    ? await supabase
        .from("miniature_photos")
        .select("*")
        .eq("miniature_id", id)
        .order("display_order", { ascending: true })
    : { data: null };

  // Create duplicate
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...miniatureData } = original;
  
  const { data: duplicate, error: createError } = await supabase
    .from("miniatures")
    .insert({
      ...miniatureData,
      name: original.name,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  // Create status for duplicate (copy status but reset completion date)
  const { error: statusError } = await supabase.from("miniature_status").insert({
    miniature_id: duplicate.id,
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

  // Copy recipe links if any exist
  if (originalRecipes && originalRecipes.length > 0) {
    const recipeLinks = originalRecipes.map((link) => ({
      miniature_id: duplicate.id,
      recipe_id: link.recipe_id,
    }));

    const { error: recipesError } = await supabase
      .from("miniature_recipes")
      .insert(recipeLinks);

    if (recipesError) {
      console.error("Error copying recipe links:", recipesError);
      // Don't throw - we still want the duplicate to succeed even if recipe links fail
    }
  }

  // Copy photos if requested and any exist
  if (options?.copyImages && originalPhotos && originalPhotos.length > 0) {
    const photosToInsert = [];
    for (const photo of originalPhotos) {
      let finalStoragePath = photo.storage_path;
      try {
        const ext = photo.storage_path.split(".").pop() || "jpg";
        const cleanExt = ext.split("?")[0].split("#")[0];
        const targetKey = `miniatures/${duplicate.id}/${Date.now()}-${photo.id}.${cleanExt}`;
        await copyR2Object(photo.storage_path, targetKey);
        finalStoragePath = targetKey;
      } catch (copyErr) {
        console.warn("Could not copy R2 object, referencing existing storage path:", copyErr);
      }
      photosToInsert.push({
        miniature_id: duplicate.id,
        storage_path: finalStoragePath,
        caption: photo.caption,
        photo_type: photo.photo_type,
        display_order: photo.display_order,
      });
    }

    if (photosToInsert.length > 0) {
      const { error: photosError } = await supabase
        .from("miniature_photos")
        .insert(photosToInsert);

      if (photosError) {
        console.error("Error copying photos:", photosError);
      }
    }
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true, miniature: duplicate };
}
