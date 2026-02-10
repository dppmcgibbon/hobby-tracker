"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createArmyType(data: {
  name: string;
  description?: string;
}) {
  const supabase = await createClient();

  const { data: armyType, error } = await supabase
    .from("army_types")
    .insert({
      name: data.name,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating army type:", error);
    throw new Error(`Failed to create army type: ${error.message}`);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/army-types");
  return armyType;
}

export async function updateArmyType(
  id: string,
  data: {
    name: string;
    description?: string;
  }
) {
  const supabase = await createClient();

  const { data: armyType, error } = await supabase
    .from("army_types")
    .update({
      name: data.name,
      description: data.description || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating army type:", error);
    throw new Error(`Failed to update army type: ${error.message}`);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/army-types");
  return armyType;
}

export async function deleteArmyType(id: string) {
  const supabase = await createClient();

  // Check if army type is in use
  const { data: factions, error: checkError } = await supabase
    .from("factions")
    .select("id")
    .eq("army_type_id", id)
    .limit(1);

  if (checkError) {
    console.error("Error checking army type usage:", checkError);
    throw new Error(`Failed to check army type usage: ${checkError.message}`);
  }

  if (factions && factions.length > 0) {
    throw new Error("Cannot delete army type that is in use by factions");
  }

  const { error } = await supabase
    .from("army_types")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting army type:", error);
    throw new Error(`Failed to delete army type: ${error.message}`);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/army-types");
}
