"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { stlFileSchema, type StlFileInput } from "@/lib/validations/stl";

export async function uploadStlFile(
  formData: FormData
): Promise<{ success: boolean; error?: string; stlFile?: Record<string, unknown> }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const source = formData.get("source") as string;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file extension
  if (!file.name.toLowerCase().endsWith(".stl")) {
    return { success: false, error: "File must be an STL file" };
  }

  // Generate unique filename
  const fileName = `${user.id}/${Date.now()}-${file.name}`;

  // Upload STL to storage
  const { error: uploadError } = await supabase.storage.from("stl-files").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  let thumbnailPath = null;

  // Upload thumbnail if provided
  if (thumbnail) {
    const thumbExt = thumbnail.name.split(".").pop();
    const thumbFileName = `${user.id}/${Date.now()}-thumb.${thumbExt}`;

    const { error: thumbError } = await supabase.storage
      .from("stl-thumbnails")
      .upload(thumbFileName, thumbnail, {
        cacheControl: "3600",
        upsert: false,
      });

    if (!thumbError) {
      thumbnailPath = thumbFileName;
    }
  }

  // Save metadata to database
  const { data: stlFile, error: dbError } = await supabase
    .from("stl_files")
    .insert({
      user_id: user.id,
      name: name || file.name,
      storage_path: fileName,
      file_size_bytes: file.size,
      description: description || null,
      source: source || null,
      thumbnail_path: thumbnailPath,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded files
    await supabase.storage.from("stl-files").remove([fileName]);
    if (thumbnailPath) {
      await supabase.storage.from("stl-thumbnails").remove([thumbnailPath]);
    }
    return { success: false, error: dbError.message };
  }

  revalidatePath("/dashboard/stl");
  return { success: true, stlFile };
}

export async function updateStlFile(id: string, data: StlFileInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = stlFileSchema.parse(data);

  const { data: stlFile, error } = await supabase
    .from("stl_files")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/stl");
  revalidatePath(`/dashboard/stl/${id}`);
  return { success: true, stlFile };
}

export async function deleteStlFile(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get STL file details
  const { data: stlFile, error: fetchError } = await supabase
    .from("stl_files")
    .select("storage_path, thumbnail_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !stlFile) {
    return { success: false, error: "STL file not found" };
  }

  // Delete from storage
  await supabase.storage.from("stl-files").remove([stlFile.storage_path]);

  if (stlFile.thumbnail_path) {
    await supabase.storage.from("stl-thumbnails").remove([stlFile.thumbnail_path]);
  }

  // Delete from database
  const { error: dbError } = await supabase.from("stl_files").delete().eq("id", id);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  revalidatePath("/dashboard/stl");
  return { success: true };
}

export async function linkStlToMiniature(stlFileId: string, miniatureId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership of both
  const [{ data: stl }, { data: miniature }] = await Promise.all([
    supabase.from("stl_files").select("id").eq("id", stlFileId).eq("user_id", user.id).single(),
    supabase.from("miniatures").select("id").eq("id", miniatureId).eq("user_id", user.id).single(),
  ]);

  if (!stl || !miniature) {
    throw new Error("STL file or miniature not found");
  }

  // Create a print record linking them
  const { data: print, error } = await supabase
    .from("prints")
    .insert({
      user_id: user.id,
      stl_file_id: stlFileId,
      miniature_id: miniatureId,
      status: "completed",
      quantity: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${miniatureId}`);
  revalidatePath(`/dashboard/stl/${stlFileId}`);
  return { success: true, print };
}

export async function addStlTag(stlFileId: string, tagId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: stlFile } = await supabase
    .from("stl_files")
    .select("id")
    .eq("id", stlFileId)
    .eq("user_id", user.id)
    .single();

  if (!stlFile) {
    throw new Error("STL file not found");
  }

  const { error } = await supabase.from("stl_tags").insert({
    stl_file_id: stlFileId,
    tag_id: tagId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/stl/${stlFileId}`);
  return { success: true };
}

export async function removeStlTag(stlFileId: string, tagId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: stlFile } = await supabase
    .from("stl_files")
    .select("id")
    .eq("id", stlFileId)
    .eq("user_id", user.id)
    .single();

  if (!stlFile) {
    throw new Error("STL file not found");
  }

  const { error } = await supabase
    .from("stl_tags")
    .delete()
    .eq("stl_file_id", stlFileId)
    .eq("tag_id", tagId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/stl/${stlFileId}`);
  return { success: true };
}
