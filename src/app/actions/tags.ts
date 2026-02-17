"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { tagSchema, type TagInput } from "@/lib/validations/tag";

export async function createTag(data: TagInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = tagSchema.parse(data);

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({
      user_id: user.id,
      name: validated.name,
      color: validated.color,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true, tag };
}

export async function deleteTag(tagId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("tags").delete().eq("id", tagId).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function addTagToMiniature(miniatureId: string, tagId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  // Check if tag is already assigned
  const { data: existing } = await supabase
    .from("miniature_tags")
    .select("*")
    .eq("miniature_id", miniatureId)
    .eq("tag_id", tagId)
    .single();

  // If already assigned, silently succeed (idempotent operation)
  if (existing) {
    revalidatePath(`/dashboard/miniatures/${miniatureId}`);
    revalidatePath("/dashboard/miniatures");
    return { success: true, alreadyExists: true };
  }

  const { error } = await supabase.from("miniature_tags").insert({
    miniature_id: miniatureId,
    tag_id: tagId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  revalidatePath("/dashboard/miniatures");
  return { success: true, alreadyExists: false };
}

export async function removeTagFromMiniature(miniatureId: string, tagId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  const { error } = await supabase
    .from("miniature_tags")
    .delete()
    .eq("miniature_id", miniatureId)
    .eq("tag_id", tagId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  revalidatePath("/dashboard/miniatures");
  return { success: true };
}

export async function bulkAddTags(miniatureIds: string[], tagId: string) {
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

  // Get existing tag assignments to avoid duplicates
  const { data: existingTags } = await supabase
    .from("miniature_tags")
    .select("miniature_id")
    .in("miniature_id", miniatureIds)
    .eq("tag_id", tagId);

  // Filter out miniatures that already have this tag
  const existingMiniatureIds = new Set(existingTags?.map((t) => t.miniature_id) || []);
  const newMiniatureIds = miniatureIds.filter((id) => !existingMiniatureIds.has(id));

  // Only insert if there are new assignments
  if (newMiniatureIds.length === 0) {
    revalidatePath("/dashboard/miniatures");
    return {
      success: true,
      message: "All selected miniatures already have this tag",
      skipped: miniatureIds.length,
      added: 0,
    };
  }

  const records = newMiniatureIds.map((id) => ({
    miniature_id: id,
    tag_id: tagId,
  }));

  const { error } = await supabase.from("miniature_tags").insert(records);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  return {
    success: true,
    message:
      existingMiniatureIds.size > 0
        ? `Tagged ${newMiniatureIds.length} miniature(s), skipped ${existingMiniatureIds.size} already tagged`
        : undefined,
    added: newMiniatureIds.length,
    skipped: existingMiniatureIds.size,
  };
}
