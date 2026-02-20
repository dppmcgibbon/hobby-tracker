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

export async function getPaintEquivalents(paintId: string) {
  const supabase = await createClient();

  // Equivalents can be in either direction: paint_id -> equivalent_paint_id or equivalent_paint_id -> paint_id
  const { data: asSource, error: err1 } = await supabase
    .from("paint_equivalents")
    .select("equivalent_paint_id")
    .eq("paint_id", paintId);

  const { data: asTarget, error: err2 } = await supabase
    .from("paint_equivalents")
    .select("paint_id")
    .eq("equivalent_paint_id", paintId);

  if (err1 || err2) {
    throw new Error(err1?.message ?? err2?.message ?? "Failed to fetch equivalents");
  }

  const equivalentIds = [
    ...(asSource?.map((r) => r.equivalent_paint_id) ?? []),
    ...(asTarget?.map((r) => r.paint_id) ?? []),
  ].filter(Boolean) as string[];

  if (equivalentIds.length === 0) return [];

  const { data: paints, error } = await supabase
    .from("paints")
    .select("*")
    .in("id", equivalentIds);

  if (error) throw new Error(error.message);
  return paints ?? [];
}
