"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { printSchema, type PrintInput } from "@/lib/validations/stl";
import { updateMaterialQuantity } from "./materials";

export async function createPrint(data: PrintInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = printSchema.parse(data);

  const { data: print, error } = await supabase
    .from("prints")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Update material quantity if material was used
  if (validated.material_id && validated.material_used_ml) {
    await updateMaterialQuantity(validated.material_id, -validated.material_used_ml, "ml");
  }

  revalidatePath("/dashboard/prints");
  return { success: true, print };
}

export async function updatePrint(id: string, data: PrintInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = printSchema.parse(data);

  const { data: print, error } = await supabase
    .from("prints")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/prints");
  revalidatePath(`/dashboard/prints/${id}`);
  return { success: true, print };
}

export async function deletePrint(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("prints").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/prints");
  return { success: true };
}

export async function updatePrintStatus(id: string, status: string, failureReason?: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const updates: { status: string; failure_reason?: string } = { status };
  if (status === "failed" && failureReason) {
    updates.failure_reason = failureReason;
  }

  const { data: print, error } = await supabase
    .from("prints")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/prints");
  return { success: true, print };
}
