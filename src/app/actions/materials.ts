"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { materialSchema, type MaterialInput } from "@/lib/validations/stl";

export async function createMaterial(data: MaterialInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = materialSchema.parse(data);

  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/materials");
  return { success: true, material };
}

export async function updateMaterial(id: string, data: MaterialInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = materialSchema.parse(data);

  const { data: material, error } = await supabase
    .from("materials")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/materials");
  return { success: true, material };
}

export async function deleteMaterial(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("materials").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/materials");
  return { success: true };
}

export async function updateMaterialQuantity(
  id: string,
  quantityChange: number,
  type: "ml" | "grams"
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get current material
  const { data: material } = await supabase
    .from("materials")
    .select("quantity_ml, quantity_grams")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!material) {
    throw new Error("Material not found");
  }

  const updates =
    type === "ml"
      ? { quantity_ml: (material.quantity_ml || 0) + quantityChange }
      : { quantity_grams: (material.quantity_grams || 0) + quantityChange };

  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/materials");
  return { success: true };
}
