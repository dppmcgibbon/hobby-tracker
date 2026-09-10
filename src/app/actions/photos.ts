"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { removeBackgroundFromBuffer, isBackgroundRemovalAvailable } from "@/lib/background-removal";
import {
  generatePresignedUploadUrl,
  deleteR2Object,
  uploadR2Object,
  downloadR2Object,
} from "@/lib/r2";

/** Call from client to see if REMOVE_BG_API_KEY is set (so we can show a hint). */
export async function getBackgroundRemovalConfig(): Promise<{
  available: boolean;
  hint?: string;
}> {
  const available = isBackgroundRemovalAvailable();
  return {
    available,
    hint: available
      ? undefined
      : "Background removal is off: set REMOVE_BG_API_KEY in your environment (local: .env.local; production: Vercel → Project Settings → Environment Variables). Get a key at remove.bg/api.",
  };
}

/**
 * Server Action to generate a secure presigned upload URL for direct client-to-R2 upload.
 */
export async function getPresignedUploadUrl(
  miniatureId: string,
  filename: string,
  contentType: string
): Promise<{
  success: true;
  presignedUrl: string;
  key: string;
  publicUrl: string;
}> {
  await requireAuth();

  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed",
  ];
  if (!validTypes.includes(contentType)) {
    throw new Error("Invalid file type.");
  }

  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `miniatures/${miniatureId}/${timestamp}-${cleanFilename}`;

  const result = await generatePresignedUploadUrl(key, contentType);
  return { success: true, ...result };
}

/**
 * Server Action to save a photo record in PostgreSQL after successful R2 upload.
 */
export async function savePhotoRecord(
  miniatureId: string,
  storagePath: string,
  caption?: string | null,
  photoType?: string | null
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Determine next display_order for miniature
  const { data: maxOrderPhoto } = await supabase
    .from("miniature_photos")
    .select("display_order")
    .eq("miniature_id", miniatureId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextDisplayOrder =
    maxOrderPhoto && maxOrderPhoto.length > 0 && maxOrderPhoto[0].display_order != null
      ? maxOrderPhoto[0].display_order + 1
      : 0;

  const { data: photo, error: dbError } = await supabase
    .from("miniature_photos")
    .insert({
      miniature_id: miniatureId,
      storage_path: storagePath,
      caption: caption || null,
      photo_type: photoType || "wip",
      display_order: nextDisplayOrder,
    })
    .select()
    .single();

  if (dbError) {
    // Attempt to clean up R2 object if DB insertion fails
    try {
      await deleteR2Object(storagePath);
    } catch (cleanupErr) {
      console.error("Failed to cleanup R2 object after DB error:", cleanupErr);
    }
    throw new Error(dbError.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true, photo };
}

/**
 * Server upload action (fallback / server-processed uploads).
 */
export async function uploadMiniaturePhoto(miniatureId: string, formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

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

  const removeBackground = formData.get("remove_background") === "true";
  const timestamp = Date.now();
  const basePath = `miniatures/${miniatureId}/${timestamp}`;
  let uploadBuffer: Buffer;
  let contentType = file.type;
  let finalPath: string;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (removeBackground) {
    try {
      const pngBuffer = await removeBackgroundFromBuffer(fileBuffer, file.type);
      if (pngBuffer) {
        uploadBuffer = pngBuffer;
        contentType = "image/png";
        finalPath = `${basePath}.png`;
      } else {
        const fileExt = file.name.split(".").pop();
        uploadBuffer = fileBuffer;
        finalPath = `${basePath}.${fileExt}`;
      }
    } catch {
      const fileExt = file.name.split(".").pop();
      uploadBuffer = fileBuffer;
      finalPath = `${basePath}.${fileExt}`;
    }
  } else {
    const fileExt = file.name.split(".").pop();
    uploadBuffer = fileBuffer;
    finalPath = `${basePath}.${fileExt}`;
  }

  const { key } = await uploadR2Object(finalPath, uploadBuffer, contentType);

  const caption = formData.get("caption") as string | null;
  const photoType = formData.get("photo_type") as string | null;

  // Determine next display_order for miniature
  const { data: maxOrderPhoto } = await supabase
    .from("miniature_photos")
    .select("display_order")
    .eq("miniature_id", miniatureId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextDisplayOrder =
    maxOrderPhoto && maxOrderPhoto.length > 0 && maxOrderPhoto[0].display_order != null
      ? maxOrderPhoto[0].display_order + 1
      : 0;

  const { data: photo, error: dbError } = await supabase
    .from("miniature_photos")
    .insert({
      miniature_id: miniatureId,
      storage_path: key,
      caption: caption || null,
      photo_type: photoType || "wip",
      display_order: nextDisplayOrder,
    })
    .select()
    .single();

  if (dbError) {
    await deleteR2Object(key);
    throw new Error(dbError.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true, photo };
}

/**
 * Server action to delete a photo from PostgreSQL database and Cloudflare R2 storage.
 */
export async function deleteMiniaturePhoto(photoId: string, storagePath: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Delete from database
  const { error: dbError } = await supabase.from("miniature_photos").delete().eq("id", photoId);

  if (dbError) {
    throw new Error(dbError.message);
  }

  // Delete from R2 storage
  try {
    await deleteR2Object(storagePath);
  } catch (storageError) {
    console.error("Failed to delete from R2 storage:", storageError);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

/** Process one photo: download from R2, remove background, re-upload to R2. */
async function processRemoveBackgroundForPhoto(storagePath: string): Promise<void> {
  const buffer = await downloadR2Object(storagePath);
  // Estimate mime type from extension or default to jpeg
  const ext = storagePath.split(".").pop()?.toLowerCase();
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const pngBuffer = await removeBackgroundFromBuffer(buffer, mimeType);
  if (!pngBuffer) {
    throw new Error(BG_REMOVAL_NOT_CONFIGURED);
  }

  await uploadR2Object(storagePath, pngBuffer, "image/png");
}

const BG_REMOVAL_NOT_CONFIGURED =
  "Background removal is not configured. Set REMOVE_BG_API_KEY in your environment (e.g. Vercel → Project Settings → Environment Variables).";

export async function removeBackgroundFromPhoto(
  photoId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!isBackgroundRemovalAvailable()) {
      return { success: false, error: BG_REMOVAL_NOT_CONFIGURED };
    }

    const user = await requireAuth();
    const supabase = await createClient();

    const { data: photo, error: fetchError } = await supabase
      .from("miniature_photos")
      .select("storage_path, miniature_id")
      .eq("id", photoId)
      .single();

    if (fetchError || !photo) {
      return { success: false, error: "Photo not found" };
    }

    await processRemoveBackgroundForPhoto(photo.storage_path);
    await supabase
      .from("miniature_photos")
      .update({ image_updated_at: new Date().toISOString() })
      .eq("id", photoId);
    revalidatePath(`/dashboard/miniatures/${photo.miniature_id}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background removal failed";
    console.error("[removeBackgroundFromPhoto]", message, err);
    return { success: false, error: message };
  }
}

export async function removeBackgroundsForMiniature(
  miniatureId: string
): Promise<
  { success: true; processed: number } | { success: false; error: string; processed?: number }
> {
  try {
    if (!isBackgroundRemovalAvailable()) {
      return { success: false, error: BG_REMOVAL_NOT_CONFIGURED };
    }

    const user = await requireAuth();
    const supabase = await createClient();

    const { data: photos, error: fetchError } = await supabase
      .from("miniature_photos")
      .select("id, storage_path")
      .eq("miniature_id", miniatureId);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    if (!photos?.length) {
      return { success: true, processed: 0 };
    }

    let processed = 0;
    for (const photo of photos) {
      try {
        await processRemoveBackgroundForPhoto(photo.storage_path);
        await supabase
          .from("miniature_photos")
          .update({ image_updated_at: new Date().toISOString() })
          .eq("id", photo.id);
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Background removal failed";
        console.error(`[removeBackgroundsForMiniature] photo ${photo.id}:`, message);
        return {
          success: false,
          error: `Stopped after ${processed} of ${photos.length}: ${message}`,
          processed,
        };
      }
    }

    revalidatePath(`/dashboard/miniatures/${miniatureId}`);
    return { success: true, processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background removal failed";
    console.error("[removeBackgroundsForMiniature]", message, err);
    return { success: false, error: message };
  }
}

/**
 * Replaces a photo's image in R2 with an uploaded file (e.g. after client-side background removal).
 */
export async function replacePhotoWithImage(
  photoId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const { data: photo, error: fetchError } = await supabase
      .from("miniature_photos")
      .select("storage_path, miniature_id")
      .eq("id", photoId)
      .single();

    if (fetchError || !photo) {
      return { success: false, error: "Photo not found" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadR2Object(photo.storage_path, buffer, file.type || "image/png");

    await supabase
      .from("miniature_photos")
      .update({ image_updated_at: new Date().toISOString() })
      .eq("id", photoId);

    revalidatePath(`/dashboard/miniatures/${photo.miniature_id}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to replace photo";
    return { success: false, error: message };
  }
}

/**
 * Server action to reorder photos for a miniature.
 */
export async function reorderMiniaturePhotos(
  miniatureId: string,
  photoIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = await createClient();

  const updates = photoIds.map((id, index) =>
    supabase
      .from("miniature_photos")
      .update({ display_order: index })
      .eq("id", id)
      .eq("miniature_id", miniatureId)
  );

  const results = await Promise.all(updates);
  const failedResult = results.find((r) => r.error);
  if (failedResult?.error) {
    console.error("Failed to reorder miniature photos:", failedResult.error);
    return { success: false, error: failedResult.error.message };
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}
