"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import {
  removeBackgroundFromBuffer,
  isBackgroundRemovalAvailable,
} from "@/lib/background-removal";

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

export async function uploadMiniaturePhoto(miniatureId: string, formData: FormData) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get the file from FormData
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // Validate file size (max 12MB)
  const maxSize = 12 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 12MB.");
  }

  const removeBackground = formData.get("remove_background") === "true";
  let uploadPayload: { body: Buffer | File; contentType: string; path: string };
  const timestamp = Date.now();
  const basePath = `${user.id}/${miniatureId}/${timestamp}`;

  if (removeBackground) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    try {
      const pngBuffer = await removeBackgroundFromBuffer(buffer, file.type);
      if (pngBuffer) {
        uploadPayload = {
          body: pngBuffer,
          contentType: "image/png",
          path: `${basePath}.png`,
        };
      } else {
        const fileExt = file.name.split(".").pop();
        uploadPayload = {
          body: file,
          contentType: file.type,
          path: `${basePath}.${fileExt}`,
        };
      }
    } catch {
      // API failed; upload original
      const fileExt = file.name.split(".").pop();
      uploadPayload = {
        body: file,
        contentType: file.type,
        path: `${basePath}.${fileExt}`,
      };
    }
  } else {
    const fileExt = file.name.split(".").pop();
    uploadPayload = {
      body: file,
      contentType: file.type,
      path: `${basePath}.${fileExt}`,
    };
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("miniature-photos")
    .upload(uploadPayload.path, uploadPayload.body, {
      contentType: uploadPayload.contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`Failed to upload photo: ${uploadError.message || "Unknown storage error"}`);
  }

  if (!uploadData || !uploadData.path) {
    throw new Error("Upload succeeded but no path was returned");
  }

  // Save photo record to database
  const caption = formData.get("caption") as string | null;
  const photoType = formData.get("photo_type") as string | null;

  const { data: photo, error: dbError } = await supabase
    .from("miniature_photos")
    .insert({
      miniature_id: miniatureId,
      user_id: user.id,
      storage_path: uploadData.path,
      caption: caption || null,
      photo_type: photoType || "wip",
    })
    .select()
    .single();

  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from("miniature-photos").remove([uploadData.path]);
    throw new Error(dbError.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true, photo };
}

export async function deleteMiniaturePhoto(photoId: string, storagePath: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Delete from database
  const { error: dbError } = await supabase
    .from("miniature_photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (dbError) {
    throw new Error(dbError.message);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("miniature-photos")
    .remove([storagePath]);

  if (storageError) {
    console.error("Failed to delete from storage:", storageError);
    // Don't throw error here as the database record is already deleted
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

/** Process one photo: download, remove background, re-upload (same path, upsert). */
async function processRemoveBackgroundForPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string
): Promise<void> {
  const { data, error: downloadError } = await supabase.storage
    .from("miniature-photos")
    .download(storagePath);

  if (downloadError || !data) {
    throw new Error(downloadError?.message ?? "Failed to download photo");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || "image/jpeg";
  const pngBuffer = await removeBackgroundFromBuffer(buffer, mimeType);
  if (!pngBuffer) {
    throw new Error(BG_REMOVAL_NOT_CONFIGURED);
  }

  const { error: uploadError } = await supabase.storage
    .from("miniature-photos")
    .upload(storagePath, pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }
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
      .eq("user_id", user.id)
      .single();

    if (fetchError || !photo) {
      return { success: false, error: "Photo not found" };
    }

    await processRemoveBackgroundForPhoto(supabase, photo.storage_path);
    await supabase
      .from("miniature_photos")
      .update({ image_updated_at: new Date().toISOString() })
      .eq("id", photoId)
      .eq("user_id", user.id);
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
  | { success: true; processed: number }
  | { success: false; error: string; processed?: number }
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
      .eq("miniature_id", miniatureId)
      .eq("user_id", user.id);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    if (!photos?.length) {
      return { success: true, processed: 0 };
    }

    let processed = 0;
    for (const photo of photos) {
      try {
        await processRemoveBackgroundForPhoto(supabase, photo.storage_path);
        await supabase
          .from("miniature_photos")
          .update({ image_updated_at: new Date().toISOString() })
          .eq("id", photo.id)
          .eq("user_id", user.id);
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
 * Replaces a photo's image with an uploaded file (e.g. after client-side background removal).
 * FormData must contain a single "file" (Blob/File).
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
      .eq("user_id", user.id)
      .single();

    if (fetchError || !photo) {
      return { success: false, error: "Photo not found" };
    }

    const { error: uploadError } = await supabase.storage
      .from("miniature-photos")
      .upload(photo.storage_path, file, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    await supabase
      .from("miniature_photos")
      .update({ image_updated_at: new Date().toISOString() })
      .eq("id", photoId)
      .eq("user_id", user.id);

    revalidatePath(`/dashboard/miniatures/${photo.miniature_id}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to replace photo";
    return { success: false, error: message };
  }
}
