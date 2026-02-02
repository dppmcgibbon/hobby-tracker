"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { z } from "zod";

const storageBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

type StorageBoxInput = z.infer<typeof storageBoxSchema>;

export async function createStorageBox(data: StorageBoxInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = storageBoxSchema.parse(data);

  // Insert storage box
  const { data: storageBox, error } = await supabase
    .from("storage_boxes")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/storage");
  return { success: true, storageBox };
}

export async function updateStorageBox(id: string, data: StorageBoxInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Validate input
  const validated = storageBoxSchema.parse(data);

  // Update storage box
  const { data: storageBox, error } = await supabase
    .from("storage_boxes")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/storage");
  revalidatePath(`/dashboard/storage/${id}`);
  return { success: true, storageBox };
}

export async function deleteStorageBox(id: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("storage_boxes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/storage");
  return { success: true };
}
