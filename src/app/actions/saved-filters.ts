"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { generatePresignedUploadUrl } from "@/lib/r2";

export interface GameShortcutInput {
  name: string;
  universeId?: string;
  gameId?: string;
  editionId?: string;
  expansionId?: string;
  logoUrl?: string;
  isStarred?: boolean;
}

export async function saveFilter(name: string, filters: Record<string, string>, logoUrl?: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_filters")
    .insert({
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
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true, filter: data };
}

export async function toggleStarFilter(filterId: string, isStarred: boolean) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .update({ is_starred: isStarred })
    .eq("id", filterId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true };
}

export async function deleteFilter(filterId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .delete()
    .eq("id", filterId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard/shortcuts");
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true };
}

export async function updateFilterLogo(filterId: string, logoUrl: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("saved_filters")
    .update({ logo_url: logoUrl })
    .eq("id", filterId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true };
}

export async function createGameShortcut(data: GameShortcutInput) {
  await requireAuth();
  const supabase = await createClient();

  const filters: Record<string, string> = {};
  if (data.universeId) filters.universeId = data.universeId;
  if (data.gameId) filters.gameId = data.gameId;
  if (data.editionId) filters.editionId = data.editionId;
  if (data.expansionId) filters.expansionId = data.expansionId;

  const { data: shortcut, error } = await supabase
    .from("saved_filters")
    .insert({
      name: data.name,
      filters,
      logo_url: data.logoUrl || null,
      is_starred: data.isStarred ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true, shortcut };
}

export async function updateGameShortcut(id: string, data: GameShortcutInput) {
  await requireAuth();
  const supabase = await createClient();

  const filters: Record<string, string> = {};
  if (data.universeId) filters.universeId = data.universeId;
  if (data.gameId) filters.gameId = data.gameId;
  if (data.editionId) filters.editionId = data.editionId;
  if (data.expansionId) filters.expansionId = data.expansionId;

  const updatePayload: Record<string, any> = {
    name: data.name,
    filters,
    logo_url: data.logoUrl || null,
  };
  if (data.isStarred !== undefined) {
    updatePayload.is_starred = data.isStarred;
  }

  const { data: shortcut, error } = await supabase
    .from("saved_filters")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/shortcuts");
  revalidatePath("/dashboard/admin/shortcuts");
  return { success: true, shortcut };
}

export async function getShortcutLogoUploadUrl(filename: string, contentType: string) {
  await requireAuth();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `shortcuts/${crypto.randomUUID()}-${sanitized}`;
  return generatePresignedUploadUrl(key, contentType);
}

export async function getSavedFilters() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_filters")
    .select("*")
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
    .eq("is_starred", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
