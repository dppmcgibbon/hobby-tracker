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
  revalidatePath("/dashboard/admin/games");
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
  revalidatePath("/dashboard/admin/games");
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
  revalidatePath("/dashboard/admin/games");
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
  revalidatePath("/dashboard/admin/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  revalidatePath(`/dashboard/admin/games/${validated.game_id}`);
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
  revalidatePath("/dashboard/admin/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  revalidatePath(`/dashboard/admin/games/${validated.game_id}`);
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
  revalidatePath("/dashboard/admin/games");
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
  revalidatePath("/dashboard/admin/games");
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
    .select(
      `
      *,
      edition:editions!inner(
        id,
        game_id
      )
    `
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate both the games list and the specific game detail page
  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/admin/games");
  if (expansion?.edition?.game_id) {
    revalidatePath(`/dashboard/games/${expansion.edition.game_id}`);
    revalidatePath(`/dashboard/admin/games/${expansion.edition.game_id}`);
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
  revalidatePath("/dashboard/admin/games");
  return { success: true };
}

export async function reorderGames(orderedGameIds: string[]) {
  await requireAuth();
  const supabase = await createClient();

  const updates = orderedGameIds.map((id, index) =>
    supabase
      .from("games")
      .update({ sequence: index + 1 })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/admin/games");
  return { success: true };
}

export async function reorderEditions(orderedEditionIds: string[]) {
  await requireAuth();
  const supabase = await createClient();

  const updates = orderedEditionIds.map((id, index) =>
    supabase
      .from("editions")
      .update({ sequence: index + 1 })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/admin/games");
  return { success: true };
}

export async function reorderExpansions(orderedExpansionIds: string[]) {
  await requireAuth();
  const supabase = await createClient();

  const updates = orderedExpansionIds.map((id, index) =>
    supabase
      .from("expansions")
      .update({ sequence: index + 1 })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/admin/games");
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
export async function removeGameCover(entityType: GameEntityType, entityId: string) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current } = await supabase
    .from(tableName)
    .select("cover_image")
    .eq("id", entityId)
    .single();

  const { error } = await supabase.from(tableName).update({ cover_image: null }).eq("id", entityId);

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

  const { error } = await supabase.from(tableName).update({ cover_image: key }).eq("id", entityId);

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

  const existingLinks = Array.isArray(current?.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
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

  const existingLinks = Array.isArray(current?.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
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

export async function deleteGameLink(entityType: GameEntityType, entityId: string, linkId: string) {
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

  const existingLinks = Array.isArray(current?.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
  const targetLink = existingLinks.find((item) => item.id === linkId);
  const updatedLinks = existingLinks.filter((item) => item.id !== linkId);

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Clean up R2 object if this was an uploaded PDF
  if (targetLink) {
    const r2Key =
      (targetLink.r2_key as string) ||
      (typeof targetLink.url === "string" && targetLink.url.includes("/games/")
        ? targetLink.url
        : null);
    if (r2Key) {
      try {
        await deleteR2Object(r2Key);
      } catch (delErr) {
        console.warn("Failed to delete R2 PDF object:", delErr);
      }
    }

    // Clean up associated cover image if present
    const coverKey = (targetLink.cover_image as string) || null;
    if (coverKey) {
      try {
        await deleteR2Object(coverKey);
      } catch (delErr) {
        console.warn("Failed to delete R2 PDF cover image object:", delErr);
      }
    }
  }

  revalidateGamePaths();
  return { success: true };
}

/**
 * Generates a presigned Cloudflare R2 upload URL for a PDF document.
 */
export async function getGamePdfUploadUrl(
  entityType: GameEntityType,
  entityId: string,
  filename: string,
  contentType = "application/pdf"
) {
  await requireAuth();
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/pdfs/${timestamp}-${cleanFilename}`;

  const result = await generatePresignedUploadUrl(key, contentType);
  return { success: true, ...result };
}

/**
 * Generates a presigned Cloudflare R2 upload URL for a PDF cover/thumbnail image.
 */
export async function getGamePdfCoverUploadUrl(
  entityType: GameEntityType,
  entityId: string,
  pdfFilename: string,
  contentType = "image/webp"
): Promise<{
  success: true;
  presignedUrl: string;
  key: string;
  publicUrl: string;
}> {
  await requireAuth();

  const validTypes = ["image/webp", "image/jpeg", "image/png", "image/jpg"];
  if (!validTypes.includes(contentType)) {
    throw new Error("Invalid image content type for PDF cover.");
  }

  const cleanFilename = pdfFilename.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const ext = contentType === "image/jpeg" || contentType === "image/jpg" ? "jpg" : "webp";
  const key = `games/${entityType}/${entityId}/pdfs/${timestamp}-${cleanFilename}-cover.${ext}`;

  const result = await generatePresignedUploadUrl(key, contentType);
  return { success: true, ...result };
}

/**
 * Reorders PDF documents by updating their ordinal position field in the links list.
 */
export async function reorderGamePdfs(
  entityType: GameEntityType,
  entityId: string,
  orderedPdfIds: string[]
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error(fetchError?.message || "Record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const orderMap = new Map<string, number>();
  orderedPdfIds.forEach((id, index) => {
    orderMap.set(id, index + 1);
  });

  const updatedLinks = existingLinks.map((item) => {
    const id = String(item.id);
    if (orderMap.has(id)) {
      return {
        ...item,
        position: orderMap.get(id),
      };
    }
    return item;
  });

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

/**
 * Saves an uploaded PDF document record to the game/edition/expansion links list.
 */
export async function saveGamePdf(
  entityType: GameEntityType,
  entityId: string,
  input: {
    title: string;
    r2Key: string;
    fileSize?: number | null;
    description?: string | null;
    coverImageKey?: string | null;
    pdfCategory?: string | null;
  }
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

  const existingLinks = Array.isArray(current?.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
  const publicUrl = getR2PublicUrl(input.r2Key);

  // Compute next position for new PDF
  const existingPdfPositions = existingLinks
    .filter((item) => {
      const cat = String(item.category || "").toLowerCase();
      const url = String(item.url || "").toLowerCase();
      const storage = String(item.storage_path || item.r2_key || "").toLowerCase();
      return (
        cat === "pdf" ||
        storage.includes("/pdfs/") ||
        url.endsWith(".pdf") ||
        url.includes(".pdf?") ||
        url.includes("/pdfs/")
      );
    })
    .map((item) => (typeof item.position === "number" ? item.position : 0));
  const nextPosition =
    existingPdfPositions.length > 0 ? Math.max(...existingPdfPositions, 0) + 1 : 1;

  const newPdfLink = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    url: publicUrl,
    r2_key: input.r2Key,
    cover_image: input.coverImageKey || null,
    category: "PDF",
    pdf_category: input.pdfCategory?.trim() || "Rules",
    description: input.description?.trim() || null,
    file_size: input.fileSize || null,
    position: nextPosition,
    uploaded_at: new Date().toISOString(),
  };

  const updatedLinks = [...existingLinks, newPdfLink];

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true, link: newPdfLink };
}

/**
 * Server-side fallback for uploading a PDF directly to Cloudflare R2 and saving it.
 */
export async function uploadGamePdfServerSide(
  entityType: GameEntityType,
  entityId: string,
  formData: FormData
) {
  await requireAuth();
  const file = formData.get("file") as File | null;
  const coverFile = formData.get("coverFile") as File | null;
  const title = (formData.get("title") as string | null) || file?.name || "Document";
  const description = (formData.get("description") as string | null) || null;
  const pdfCategory =
    (formData.get("pdf_category") as string | null) ||
    (formData.get("category") as string | null) ||
    null;

  if (!file) {
    throw new Error("No PDF file provided.");
  }

  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/pdfs/${timestamp}-${cleanFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { key: r2Key } = await uploadR2Object(key, buffer, file.type || "application/pdf");

  let coverImageKey: string | null = null;
  if (coverFile) {
    try {
      const coverClean = (coverFile.name || "cover.webp").replace(/[^a-zA-Z0-9._-]/g, "_");
      const coverKey = `games/${entityType}/${entityId}/pdfs/${timestamp}-${cleanFilename}-cover-${coverClean}`;
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const { key: uploadedCoverKey } = await uploadR2Object(
        coverKey,
        coverBuffer,
        coverFile.type || "image/webp"
      );
      coverImageKey = uploadedCoverKey;
    } catch (coverErr) {
      console.warn("Failed to upload fallback cover image to R2:", coverErr);
    }
  }

  return await saveGamePdf(entityType, entityId, {
    title,
    r2Key,
    fileSize: file.size,
    description,
    coverImageKey,
    pdfCategory,
  });
}

/**
 * Updates or persists a cover image key for an existing PDF document link.
 */
export async function savePdfCoverImage(
  entityType: GameEntityType,
  entityId: string,
  linkId: string,
  coverImageKey: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const targetLink = existingLinks.find((item) => item.id === linkId);
  if (!targetLink) {
    throw new Error("PDF document not found");
  }

  // Delete previous cover if different
  const oldCoverKey = (targetLink.cover_image as string) || null;
  if (oldCoverKey && oldCoverKey !== coverImageKey) {
    try {
      await deleteR2Object(oldCoverKey);
    } catch (delErr) {
      console.warn("Failed to delete old PDF cover from R2:", delErr);
    }
  }

  const updatedLinks = existingLinks.map((item) => {
    if (item.id === linkId) {
      return {
        ...item,
        cover_image: coverImageKey,
      };
    }
    return item;
  });

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

/**
 * Generates a presigned Cloudflare R2 upload URL for a game/edition/expansion image.
 */
export async function getGameImageUploadUrl(
  entityType: GameEntityType,
  entityId: string,
  filename: string,
  contentType = "image/jpeg"
) {
  await requireAuth();
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/images/${timestamp}-${cleanFilename}`;

  const result = await generatePresignedUploadUrl(key, contentType);
  return { success: true, ...result };
}

/**
 * Saves an uploaded image record to the game/edition/expansion links list.
 */
export async function saveGameImageRecord(
  entityType: GameEntityType,
  entityId: string,
  input: {
    storagePath: string;
    caption?: string | null;
    album?: string | null;
  }
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

  const existingLinks = Array.isArray(current?.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
  const publicUrl = getR2PublicUrl(input.storagePath);

  const newImage = {
    id: crypto.randomUUID(),
    title: input.caption?.trim() || "Game Photo",
    url: publicUrl,
    storage_path: input.storagePath,
    r2_key: input.storagePath,
    category: "IMAGE",
    album: input.album?.trim() || "Games",
    caption: input.caption?.trim() || null,
    uploaded_at: new Date().toISOString(),
    image_updated_at: null,
  };

  const updatedLinks = [...existingLinks, newImage];

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true, image: newImage };
}

/**
 * Fallback server-side upload for a game image.
 */
export async function uploadGameImageServerSide(
  entityType: GameEntityType,
  entityId: string,
  formData: FormData
) {
  await requireAuth();
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string | null) || null;
  const album = (formData.get("album") as string | null) || null;

  if (!file) {
    throw new Error("No image file provided.");
  }

  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `games/${entityType}/${entityId}/images/${timestamp}-${cleanFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { key: storagePath } = await uploadR2Object(key, buffer, file.type || "image/jpeg");

  return await saveGameImageRecord(entityType, entityId, {
    storagePath,
    caption,
    album,
  });
}

/**
 * Replaces a game image in R2 with a new file (e.g. after background removal).
 */
export async function replaceGameImageWithImage(
  entityType: GameEntityType,
  entityId: string,
  imageId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const tableName = getTableName(entityType);

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const { data: current, error: fetchError } = await supabase
      .from(tableName)
      .select("links")
      .eq("id", entityId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: "Game record not found" };
    }

    const existingLinks = Array.isArray(current.links)
      ? (current.links as Array<Record<string, unknown>>)
      : [];
    const targetImage = existingLinks.find((item) => item.id === imageId);

    if (!targetImage) {
      return { success: false, error: "Image not found" };
    }

    const storagePath = (targetImage.storage_path as string) || (targetImage.r2_key as string);
    if (!storagePath) {
      return { success: false, error: "Image storage path not found" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadR2Object(storagePath, buffer, file.type || "image/png");

    const now = new Date().toISOString();
    const updatedLinks = existingLinks.map((item) => {
      if (item.id === imageId) {
        return {
          ...item,
          image_updated_at: now,
        };
      }
      return item;
    });

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ links: updatedLinks })
      .eq("id", entityId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidateGamePaths();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to replace image";
    return { success: false, error: message };
  }
}

/**
 * Deletes a game image and removes it from R2 storage.
 */
export async function deleteGameImage(
  entityType: GameEntityType,
  entityId: string,
  imageId: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];
  const targetImage = existingLinks.find((item) => item.id === imageId);
  const updatedLinks = existingLinks.filter((item) => item.id !== imageId);

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const storagePath = (targetImage?.storage_path as string) || (targetImage?.r2_key as string);
  if (storagePath) {
    try {
      await deleteR2Object(storagePath);
    } catch (err) {
      console.warn("Failed to delete image from R2:", err);
    }
  }

  revalidateGamePaths();
  return { success: true };
}

/**
 * Updates the assigned album/category of an existing game image.
 */
export async function updateGameImageAlbum(
  entityType: GameEntityType,
  entityId: string,
  imageId: string,
  newAlbum: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const updatedLinks = existingLinks.map((link) => {
    if (link.id === imageId) {
      return { ...link, album: newAlbum.trim() || "Games" };
    }
    return link;
  });

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

/**
 * Persists a newly created custom album name to the entity's IMAGE_ALBUMS_CATALOG.
 */
export async function addGameImageAlbum(
  entityType: GameEntityType,
  entityId: string,
  albumName: string
) {
  await requireAuth();
  const trimmed = albumName.trim();
  if (!trimmed) {
    throw new Error("Album name cannot be empty");
  }

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogIndex = existingLinks.findIndex(
    (l) => (l.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG"
  );

  let updatedLinks: Array<Record<string, unknown>>;
  if (catalogIndex >= 0) {
    const catalog = existingLinks[catalogIndex];
    const albums = Array.isArray(catalog.albums) ? (catalog.albums as string[]) : [];
    if (!albums.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      const updatedCatalog = { ...catalog, albums: [...albums, trimmed] };
      updatedLinks = [
        ...existingLinks.slice(0, catalogIndex),
        updatedCatalog,
        ...existingLinks.slice(catalogIndex + 1),
      ];
    } else {
      return { success: true };
    }
  } else {
    const newCatalog = {
      id: "image-albums-catalog",
      category: "IMAGE_ALBUMS_CATALOG",
      albums: ["Games", "Artwork", trimmed],
    };
    updatedLinks = [...existingLinks, newCatalog];
  }

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

/**
 * Renames an existing game image album in the catalog and updates all associated images.
 */
export async function renameGameImageAlbum(
  entityType: GameEntityType,
  entityId: string,
  oldAlbumName: string,
  newAlbumName: string
) {
  await requireAuth();
  const oldTrimmed = oldAlbumName.trim();
  const newTrimmed = newAlbumName.trim();

  if (!newTrimmed) {
    throw new Error("Album name cannot be empty");
  }
  if (oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) {
    return { success: true };
  }

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogEntry = existingLinks.find(
    (l) => (l.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG"
  );
  const currentAlbums: string[] = Array.isArray(catalogEntry?.albums)
    ? (catalogEntry.albums as string[])
    : ["Games", "Artwork"];

  if (currentAlbums.some((a) => a.toLowerCase() === newTrimmed.toLowerCase())) {
    throw new Error(`Album "${newTrimmed}" already exists`);
  }

  const updatedAlbums = currentAlbums.map((a) =>
    a.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : a
  );
  if (!updatedAlbums.some((a) => a.toLowerCase() === newTrimmed.toLowerCase())) {
    updatedAlbums.push(newTrimmed);
  }

  let catalogFound = false;
  const updatedLinks = existingLinks.map((link) => {
    if ((link.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG") {
      catalogFound = true;
      return {
        ...link,
        albums: updatedAlbums,
      };
    }
    const linkAlbum = ((link.album as string) && (link.album as string).trim()) || "Games";
    if (linkAlbum.toLowerCase() === oldTrimmed.toLowerCase()) {
      return { ...link, album: newTrimmed };
    }
    return link;
  });

  if (!catalogFound) {
    updatedLinks.push({
      id: "image-albums-catalog",
      category: "IMAGE_ALBUMS_CATALOG",
      albums: updatedAlbums,
    });
  }

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

/**
 * Removes an album from the catalog and re-homes any assigned images to the fallback remaining album.
 */
export async function deleteGameImageAlbum(
  entityType: GameEntityType,
  entityId: string,
  albumName: string
) {
  await requireAuth();
  const trimmed = albumName.trim();

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogEntry = existingLinks.find(
    (l) => (l.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG"
  );
  const currentAlbums: string[] = Array.isArray(catalogEntry?.albums)
    ? (catalogEntry.albums as string[])
    : ["Games", "Artwork"];

  const remainingAlbums = currentAlbums.filter(
    (a) => a.toLowerCase() !== trimmed.toLowerCase()
  );

  if (remainingAlbums.length === 0) {
    throw new Error("Cannot delete the only album. At least one album must remain.");
  }

  const fallbackAlbum = remainingAlbums[0];

  let catalogFound = false;
  const updatedLinks = existingLinks.map((link) => {
    if ((link.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG") {
      catalogFound = true;
      return {
        ...link,
        albums: remainingAlbums,
      };
    }
    const linkAlbum = ((link.album as string) && (link.album as string).trim()) || "Games";
    if (linkAlbum.toLowerCase() === trimmed.toLowerCase()) {
      return { ...link, album: fallbackAlbum };
    }
    return link;
  });

  if (!catalogFound) {
    updatedLinks.push({
      id: "image-albums-catalog",
      category: "IMAGE_ALBUMS_CATALOG",
      albums: remainingAlbums,
    });
  }

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true, fallbackAlbum };
}

/**
 * Updates the assigned category of an existing game PDF document.
 */
export async function updateGamePdfCategory(
  entityType: GameEntityType,
  entityId: string,
  pdfId: string,
  newCategory: string
) {
  await requireAuth();
  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const updatedLinks = existingLinks.map((link) => {
    if (link.id === pdfId) {
      return { ...link, pdf_category: newCategory.trim() || "Rules" };
    }
    return link;
  });

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

/**
 * Persists a newly created custom PDF category name to the entity's PDF_CATEGORIES_CATALOG.
 */
export async function addGamePdfCategory(
  entityType: GameEntityType,
  entityId: string,
  categoryName: string
) {
  await requireAuth();
  const trimmed = categoryName.trim();
  if (!trimmed) {
    throw new Error("Category name cannot be empty");
  }

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogIndex = existingLinks.findIndex(
    (l) => (l.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG"
  );

  let updatedLinks: Array<Record<string, unknown>>;
  if (catalogIndex >= 0) {
    const catalog = existingLinks[catalogIndex];
    const categories = Array.isArray(catalog.pdf_categories)
      ? (catalog.pdf_categories as string[])
      : Array.isArray(catalog.categories)
      ? (catalog.categories as string[])
      : [];
    if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updatedCatalog = {
        ...catalog,
        pdf_categories: [...categories, trimmed],
      };
      updatedLinks = [
        ...existingLinks.slice(0, catalogIndex),
        updatedCatalog,
        ...existingLinks.slice(catalogIndex + 1),
      ];
    } else {
      return { success: true };
    }
  } else {
    const newCatalog = {
      id: "pdf-categories-catalog",
      category: "PDF_CATEGORIES_CATALOG",
      pdf_categories: ["Rules", "Reference", trimmed],
    };
    updatedLinks = [...existingLinks, newCatalog];
  }

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

/**
 * Renames an existing PDF category in the catalog and updates all associated PDFs.
 */
export async function renameGamePdfCategory(
  entityType: GameEntityType,
  entityId: string,
  oldCategoryName: string,
  newCategoryName: string
) {
  await requireAuth();
  const oldTrimmed = oldCategoryName.trim();
  const newTrimmed = newCategoryName.trim();

  if (!newTrimmed) {
    throw new Error("Category name cannot be empty");
  }
  if (oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) {
    return { success: true };
  }

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogEntry = existingLinks.find(
    (l) => (l.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG"
  );
  const currentCategories: string[] = Array.isArray(catalogEntry?.pdf_categories)
    ? (catalogEntry.pdf_categories as string[])
    : Array.isArray(catalogEntry?.categories)
    ? (catalogEntry.categories as string[])
    : ["Rules", "Reference"];

  if (currentCategories.some((c) => c.toLowerCase() === newTrimmed.toLowerCase())) {
    throw new Error(`Category "${newTrimmed}" already exists`);
  }

  const updatedCategories = currentCategories.map((c) =>
    c.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : c
  );
  if (!updatedCategories.some((c) => c.toLowerCase() === newTrimmed.toLowerCase())) {
    updatedCategories.push(newTrimmed);
  }

  let catalogFound = false;
  const updatedLinks = existingLinks.map((link) => {
    if ((link.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG") {
      catalogFound = true;
      return {
        ...link,
        pdf_categories: updatedCategories,
      };
    }
    const linkCategory =
      ((link.pdf_category as string) && (link.pdf_category as string).trim()) || "Rules";
    if (linkCategory.toLowerCase() === oldTrimmed.toLowerCase()) {
      return { ...link, pdf_category: newTrimmed };
    }
    return link;
  });

  if (!catalogFound) {
    updatedLinks.push({
      id: "pdf-categories-catalog",
      category: "PDF_CATEGORIES_CATALOG",
      pdf_categories: updatedCategories,
    });
  }

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

/**
 * Removes a PDF category from the catalog and re-homes any assigned PDFs to the fallback remaining category.
 */
export async function deleteGamePdfCategory(
  entityType: GameEntityType,
  entityId: string,
  categoryName: string
) {
  await requireAuth();
  const trimmed = categoryName.trim();

  const supabase = await createClient();
  const tableName = getTableName(entityType);

  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select("links")
    .eq("id", entityId)
    .single();

  if (fetchError || !current) {
    throw new Error("Game record not found");
  }

  const existingLinks = Array.isArray(current.links)
    ? (current.links as Array<Record<string, unknown>>)
    : [];

  const catalogEntry = existingLinks.find(
    (l) => (l.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG"
  );
  const currentCategories: string[] = Array.isArray(catalogEntry?.pdf_categories)
    ? (catalogEntry.pdf_categories as string[])
    : Array.isArray(catalogEntry?.categories)
    ? (catalogEntry.categories as string[])
    : ["Rules", "Reference"];

  const remainingCategories = currentCategories.filter(
    (c) => c.toLowerCase() !== trimmed.toLowerCase()
  );

  if (remainingCategories.length === 0) {
    throw new Error("Cannot delete the only category. At least one category must remain.");
  }

  const fallbackCategory = remainingCategories[0];

  let catalogFound = false;
  const updatedLinks = existingLinks.map((link) => {
    if ((link.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG") {
      catalogFound = true;
      return {
        ...link,
        pdf_categories: remainingCategories,
      };
    }
    const linkCategory =
      ((link.pdf_category as string) && (link.pdf_category as string).trim()) || "Rules";
    if (linkCategory.toLowerCase() === trimmed.toLowerCase()) {
      return { ...link, pdf_category: fallbackCategory };
    }
    return link;
  });

  if (!catalogFound) {
    updatedLinks.push({
      id: "pdf-categories-catalog",
      category: "PDF_CATEGORIES_CATALOG",
      pdf_categories: remainingCategories,
    });
  }

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ links: updatedLinks })
    .eq("id", entityId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateGamePaths();
  return { success: true, fallbackCategory };
}
