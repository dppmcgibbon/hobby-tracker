"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PAINT_TYPES = [
  "base",
  "layer",
  "shade",
  "dry",
  "technical",
  "contrast",
  "air",
  "spray",
] as const;

function normalizeHex(hex: string | null | undefined): string | null {
  if (hex == null || hex === "") return null;
  const cleaned = hex.replace(/^#/, "").trim();
  if (cleaned === "") return null;
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toLowerCase()}`;
}

export async function createPaint(data: {
  brand: string;
  name: string;
  type: string;
  color_hex?: string | null;
}) {
  await requireAuth();
  const supabase = await createClient();

  if (!PAINT_TYPES.includes(data.type as (typeof PAINT_TYPES)[number])) {
    throw new Error(`Invalid paint type. Must be one of: ${PAINT_TYPES.join(", ")}`);
  }

  const { data: paint, error } = await supabase
    .from("paints")
    .insert({
      brand: data.brand.trim(),
      name: data.name.trim(),
      type: data.type,
      color_hex: normalizeHex(data.color_hex),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/paints");
  revalidatePath("/dashboard/paints");
  return { success: true, paint };
}

export async function updatePaint(
  id: string,
  data: {
    brand?: string;
    name?: string;
    type?: string;
    color_hex?: string | null;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const payload: { brand?: string; name?: string; type?: string; color_hex?: string | null } = {};
  if (data.brand !== undefined) payload.brand = data.brand.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.type !== undefined) {
    if (!PAINT_TYPES.includes(data.type as (typeof PAINT_TYPES)[number])) {
      throw new Error(`Invalid paint type. Must be one of: ${PAINT_TYPES.join(", ")}`);
    }
    payload.type = data.type;
  }
  if (data.color_hex !== undefined) payload.color_hex = normalizeHex(data.color_hex);

  const { data: paint, error } = await supabase
    .from("paints")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/paints");
  revalidatePath("/dashboard/paints");
  return { success: true, paint };
}

export async function deletePaint(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("paints").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/paints");
  revalidatePath("/dashboard/paints");
  return { success: true };
}
