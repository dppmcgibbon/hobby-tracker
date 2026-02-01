import { createClient } from "@/lib/supabase/server";

export async function getAllPaints() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("paints")
    .select("*")
    .order("brand", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getUserPaints(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_paints")
    .select(
      `
      *,
      paint:paints(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getPaintById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("paints").select("*").eq("id", id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
