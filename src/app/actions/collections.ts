"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { collectionSchema, type CollectionInput } from "@/lib/validations/tag";

export async function createCollection(data: CollectionInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = collectionSchema.parse(data);

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: validated.name,
      description: validated.description,
      color: validated.color,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collections");
  return { success: true, collection };
}

export async function updateCollection(id: string, data: CollectionInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = collectionSchema.parse(data);

  const { data: collection, error } = await supabase
    .from("collections")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collections");
  revalidatePath(`/dashboard/collections/${id}`);
  return { success: true, collection };
}

export async function deleteCollection(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("collections").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/collections");
  return { success: true };
}

export async function addMiniaturesToCollection(collectionId: string, miniatureIds: string[]) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify collection ownership
  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (!collection) {
    throw new Error("Collection not found");
  }

  const records = miniatureIds.map((id, index) => ({
    collection_id: collectionId,
    miniature_id: id,
    display_order: index,
  }));

  const { error } = await supabase.from("collection_miniatures").insert(records);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collections/${collectionId}`);
  return { success: true };
}

export async function removeMiniatureFromCollection(collectionId: string, miniatureId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (!collection) {
    throw new Error("Collection not found");
  }

  const { error } = await supabase
    .from("collection_miniatures")
    .delete()
    .eq("collection_id", collectionId)
    .eq("miniature_id", miniatureId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collections/${collectionId}`);
  return { success: true };
}
