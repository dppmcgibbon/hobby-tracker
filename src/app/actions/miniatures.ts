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
