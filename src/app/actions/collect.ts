"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";

const ALLOWED_APPS = ["boardgames", "records", "stories", "magazines"] as const;

// ========== collect_apps admin CRUD ==========

export async function createCollectApp(data: {
  app: string;
  table_name: string;
  initial_sort_key?: string | null;
}) {
  await requireAuth();
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("collect_apps")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextId = (maxRow && typeof maxRow === "object" && "id" in maxRow ? (maxRow.id as number) : 0) + 1;

  const { error } = await supabase.from("collect_apps").insert({
    id: nextId,
    app: data.app.trim(),
    table_name: data.table_name.trim(),
    initial_sort_key: data.initial_sort_key?.trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

export async function updateCollectApp(
  id: number,
  data: {
    app: string;
    table_name: string;
    initial_sort_key?: string | null;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("collect_apps")
    .update({
      app: data.app.trim(),
      table_name: data.table_name.trim(),
      initial_sort_key: data.initial_sort_key?.trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

export async function deleteCollectApp(id: number) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("collect_apps").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

// ========== collect_config admin CRUD ==========

export async function createCollectConfig(data: {
  table_name: string;
  sequence: number;
  column_name: string;
  column_type: string;
  display?: number;
  initial_sort_key?: number;
  filter?: number;
}) {
  await requireAuth();
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("collect_config")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextId = (maxRow && typeof maxRow === "object" && "id" in maxRow ? (maxRow.id as number) : 0) + 1;

  const { error } = await supabase.from("collect_config").insert({
    id: nextId,
    table_name: data.table_name.trim(),
    sequence: data.sequence,
    column_name: data.column_name.trim(),
    column_type: data.column_type || "text",
    display: data.display ?? 1,
    initial_sort_key: data.initial_sort_key ?? 0,
    filter: data.filter ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

export async function updateCollectConfig(
  id: number,
  data: {
    table_name?: string;
    sequence?: number;
    column_name?: string;
    column_type?: string;
    display?: number;
    initial_sort_key?: number;
    filter?: number;
  }
) {
  await requireAuth();
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (data.table_name !== undefined) payload.table_name = data.table_name.trim();
  if (data.sequence !== undefined) payload.sequence = data.sequence;
  if (data.column_name !== undefined) payload.column_name = data.column_name.trim();
  if (data.column_type !== undefined) payload.column_type = data.column_type;
  if (data.display !== undefined) payload.display = data.display;
  if (data.initial_sort_key !== undefined) payload.initial_sort_key = data.initial_sort_key;
  if (data.filter !== undefined) payload.filter = data.filter;

  const { error } = await supabase.from("collect_config").update(payload).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

export async function deleteCollectConfig(id: number) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("collect_config").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/collect-apps");
  revalidatePath("/dashboard/collect-apps");
  return { success: true };
}

export async function updateCollectRow(
  app: string,
  id: number,
  data: Record<string, unknown>
) {
  await requireAuth();

  const table = app as (typeof ALLOWED_APPS)[number];
  if (!ALLOWED_APPS.includes(table)) {
    throw new Error(`Invalid collect app: ${app}`);
  }

  const supabase = await createClient();

  // Remove id from update payload
  const { id: _id, ...updateData } = data;
  const payload = { ...updateData } as Record<string, unknown>;

  // Coerce booleans for checkbox columns
  const booleanColumns = [
    "received", "built", "primed", "painted", "magnetised", "complete",
    "cassette", "cd", "vinyl", "digital", "bandcamp", "discogs",
    "novel",
  ];
  for (const col of booleanColumns) {
    if (col in payload) {
      payload[col] = payload[col] === true || payload[col] === "true" || payload[col] === 1 || payload[col] === "1";
    }
  }

  const { error } = await (supabase as any)
    .from(table)
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/collect-apps/${app}`);
  return { success: true };
}
