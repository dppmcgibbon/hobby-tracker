"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import {
  gameSchema,
  editionSchema,
  expansionSchema,
  miniatureGameSchema,
  type GameInput,
  type EditionInput,
  type ExpansionInput,
  type MiniatureGameInput,
} from "@/lib/validations/game";
import {
  generatePresignedUploadUrl,
  deleteR2Object,
  uploadR2Object,
  getR2PublicUrl,
} from "@/lib/r2";

// ==================== GAMES ====================

export async function createGame(data: GameInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = gameSchema.parse(data);

  const { data: game, error } = await supabase.from("games").insert(validated).select().single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true, game };
}

export async function updateGame(id: string, data: GameInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = gameSchema.parse(data);

  const { data: game, error } = await supabase
    .from("games")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${id}`);
  return { success: true, game };
}

export async function deleteGame(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("games").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== EDITIONS ====================

export async function createEdition(data: EditionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = editionSchema.parse(data);

  const { data: edition, error } = await supabase
    .from("editions")
    .insert(validated)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  return { success: true, edition };
}

export async function updateEdition(id: string, data: EditionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = editionSchema.parse(data);

  const { data: edition, error } = await supabase
    .from("editions")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  return { success: true, edition };
}

export async function deleteEdition(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("editions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== EXPANSIONS ====================

export async function createExpansion(data: ExpansionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = expansionSchema.parse(data);

  const { data: expansion, error } = await supabase
    .from("expansions")
    .insert(validated)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true, expansion };
}

export async function updateExpansion(id: string, data: ExpansionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = expansionSchema.parse(data);

  const { data: expansion, error } = await supabase
    .from("expansions")
    .update(validated)
    .eq("id", id)
    .select(`
      *,
      edition:editions!inner(
        id,
        game_id
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate both the games list and the specific game detail page
  revalidatePath("/dashboard/games");
  if (expansion?.edition?.game_id) {
    revalidatePath(`/dashboard/games/${expansion.edition.game_id}`);
  }
  return { success: true, expansion };
}

export async function deleteExpansion(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("expansions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== MINIATURE-GAME LINKS ====================

export async function linkMiniatureToGame(data: MiniatureGameInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = miniatureGameSchema.parse(data);

  // Verify miniature exists
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", validated.miniature_id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  // Use upsert to insert or update if the link already exists
  const { error } = await supabase.from("miniature_games").upsert(validated, {
    onConflict: "miniature_id,game_id",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${validated.miniature_id}`);
  return { success: true };
}

export async function unlinkMiniatureFromGame(miniatureId: string, gameId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify miniature exists
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  const { error } = await supabase
    .from("miniature_games")
    .delete()
    .eq("miniature_id", miniatureId)
    .eq("game_id", gameId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true };
}

export async function updateMiniatureGame(
  miniatureId: string,
  gameId: string,
  data: Partial<MiniatureGameInput>
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify miniature exists
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  const { error } = await supabase
    .from("miniature_games")
    .update(data)
    .eq("miniature_id", miniatureId)
    .eq("game_id", gameId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true };
}

export async function bulkLinkMinaturesToGame(
  miniatureIds: string[],
  gameId: string,
  editionId?: string | null,
  expansionId?: string | null
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Create game links for all miniatures
  const gameLinks = miniatureIds.map((miniatureId) => ({
    miniature_id: miniatureId,
    game_id: gameId,
    edition_id: editionId || null,
    expansion_id: expansionId || null,
  }));

  // Use upsert to handle existing links
  const { error } = await supabase.from("miniature_games").upsert(gameLinks, {
    onConflict: "miniature_id,game_id",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true, count: miniatureIds.length };
}

// ==================== COVERS & DETAILS ====================

export type GameEntityType = "game" | "edition" | "expansion";

function getTableName(entityType: GameEntityType): "games" | "editions" | "expansions" {
  switch (entityType) {
    case "game":
      return "games";
    case "edition":
      return "editions";
    case "expansion":
      return "expansions";
    default:
      throw new Error(`Invalid entity type: ${entityType}`);
  }
}

function revalidateGamePaths() {
  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
}

/**
 * Generates presigned URL for direct Cloudflare R2 client upload.
 */
export async function getGameCoverUploadUrl(
  entityType: GameEntityType,
  entityId: string,
  filename: string,
  contentType: string
): Promise<{
  success: true;
  presignedUrl: string;
  key: string;
  publicUrl: string;
}> {
  await requireAuth();

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(contentType)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
  }

  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/${timestamp}-${cleanFilename}`;

  const result = await generatePresignedUploadUrl(key, contentType);
  return { success: true, ...result };
}

/**
 * Saves cover image key to the database after successful R2 upload.
 */
export async function saveGameCover(
  entityType: GameEntityType,
  entityId: string,
  storagePath: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { error } = await supabase
    .from(tableName)
    .update({ cover_image: storagePath })
    .eq("id", entityId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateGamePaths();
  return { success: true, publicUrl: getR2PublicUrl(storagePath) };
}

/**
 * Removes the cover image from the database and cleans up R2 storage.
 */
export async function removeGameCover(
  entityType: GameEntityType,
  entityId: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current } = await supabase
    .from(tableName)
    .select("cover_image")
    .eq("id", entityId)
    .single();

  const { error } = await supabase
    .from(tableName)
    .update({ cover_image: null })
    .eq("id", entityId);

  if (error) {
    throw new Error(error.message);
  }

  if (current?.cover_image && current.cover_image.startsWith("games/")) {
    try {
      await deleteR2Object(current.cover_image);
    } catch (e) {
      console.error("Failed to delete cover from R2:", e);
    }
  }

  revalidateGamePaths();
  return { success: true };
}

/**
 * Updates description text for game, edition, or expansion.
 */
export async function updateGameDescription(
  entityType: GameEntityType,
  entityId: string,
  description: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const trimmed = description.trim();
  const { error } = await supabase
    .from(tableName)
    .update({ description: trimmed.length > 0 ? trimmed : null })
    .eq("id", entityId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateGamePaths();
  return { success: true };
}

/**
 * Server-side fallback for cover image upload if direct browser-to-R2 upload fails.
 */
export async function uploadGameCoverServerSide(
  entityType: GameEntityType,
  entityId: string,
  formData: FormData
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  const maxSize = 12 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 12MB.");
  }

  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/${timestamp}-${cleanFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { publicUrl } = await uploadR2Object(key, buffer, file.type);

  const { error } = await supabase
    .from(tableName)
    .update({ cover_image: key })
    .eq("id", entityId);

  if (error) {
    await deleteR2Object(key);
    throw new Error(error.message);
  }

  revalidateGamePaths();
  return { success: true, key, publicUrl };
}

// ==================== INFO & RESOURCE LINKS ====================

export interface GameLinkInput {
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
}

export async function addGameLink(
  entityType: GameEntityType,
  entityId: string,
  link: GameLinkInput
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingLinks = Array.isArray(current?.links) ? (current.links as Array<Record<string, unknown>>) : [];
  const newLink = {
    id: crypto.randomUUID(),
    title: link.title.trim(),
    url: link.url.trim(),
    description: link.description?.trim() || null,
    category: link.category?.trim() || null,
  };

  const updatedLinks = [...existingLinks, newLink];

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true, link: newLink };
}

export async function updateGameLink(
  entityType: GameEntityType,
  entityId: string,
  linkId: string,
  link: GameLinkInput
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingLinks = Array.isArray(current?.links) ? (current.links as Array<Record<string, unknown>>) : [];
  const updatedLinks = existingLinks.map((item) =>
    item.id === linkId
      ? {
          ...item,
          title: link.title.trim(),
          url: link.url.trim(),
          description: link.description?.trim() || null,
          category: link.category?.trim() || null,
        }
      : item
  );

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true };
}

export async function deleteGameLink(
  entityType: GameEntityType,
  entityId: string,
  linkId: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingLinks = Array.isArray(current?.links) ? (current.links as Array<Record<string, unknown>>) : [];
  const updatedLinks = existingLinks.filter((item) => item.id !== linkId);

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true };
}


