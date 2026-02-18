"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";

export async function saveFilter(name: string, filters: Record<string, string>, logoUrl?: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_filters")
    .insert({
      user_id: user.id,
      name,
      filters,
      logo_url: logoUrl || null,
      is_starred: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/shortcuts");
  return { success: true, filter: data };
}

export async function toggleStarFilter(filterId: string, isStarred: boolean) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .update({ is_starred: isStarred })
    .eq("id", filterId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  return { success: true };
}

export async function deleteFilter(filterId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .delete()
    .eq("id", filterId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/shortcuts");
  return { success: true };
}

export async function updateFilterLogo(filterId: string, logoUrl: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .update({ logo_url: logoUrl })
    .eq("id", filterId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  return { success: true };
}

export async function getSavedFilters() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_filters")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getStarredFilters() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_filters")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_starred", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
