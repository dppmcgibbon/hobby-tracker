"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";

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

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 5MB.");
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${miniatureId}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("miniature-photos")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
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

  revalidatePath(`/dashboard/collection/${miniatureId}`);
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

  revalidatePath("/dashboard/collection");
  return { success: true };
}
