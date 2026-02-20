"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { getPaintEquivalents as fetchPaintEquivalents } from "@/lib/queries/paints";
import { addPaintToInventorySchema, updatePaintInventorySchema } from "@/lib/validations/paint";
import type { AddPaintToInventoryInput, UpdatePaintInventoryInput } from "@/lib/validations/paint";

export async function addPaintToInventory(data: AddPaintToInventoryInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = addPaintToInventorySchema.parse(data);

  const { data: userPaint, error } = await supabase
    .from("user_paints")
    .insert({
      user_id: user.id,
      paint_id: validated.paint_id,
      quantity: validated.quantity,
      notes: validated.notes,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/paints");
  return { success: true, userPaint };
}

export async function updatePaintInventory(id: string, data: UpdatePaintInventoryInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = updatePaintInventorySchema.parse(data);

  const { data: userPaint, error } = await supabase
    .from("user_paints")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/paints");
  return { success: true, userPaint };
}

export async function removePaintFromInventory(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("user_paints").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/paints");
  return { success: true };
}

export async function getPaintEquivalents(paintId: string) {
  return fetchPaintEquivalents(paintId);
}
