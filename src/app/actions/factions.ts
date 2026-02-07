"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFaction(data: {
  name: string;
  army_type: string;
  description?: string;
  color_hex?: string;
}) {
  await requireAuth();
  const supabase = await createClient();

  const { data: faction, error } = await supabase
    .from("factions")
    .insert({
      name: data.name,
      army_type: data.army_type,
      description: data.description || null,
      color_hex: data.color_hex || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  return { success: true, faction };
}

export async function updateFaction(
  id: string,
  data: {
    name: string;
    army_type: string;
    description?: string;
    color_hex?: string;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const { data: faction, error } = await supabase
    .from("factions")
    .update({
      name: data.name,
      army_type: data.army_type,
      description: data.description || null,
      color_hex: data.color_hex || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  return { success: true, faction };
}

export async function deleteFaction(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("factions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  return { success: true };
}
