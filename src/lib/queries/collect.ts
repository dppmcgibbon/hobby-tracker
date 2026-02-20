import { createClient } from "@/lib/supabase/server";

const ALLOWED_APPS = ["boardgames", "records", "stories", "magazines"] as const;

export type CollectAppName = (typeof ALLOWED_APPS)[number];

export interface CollectApp {
  id: number;
  app: string;
  table_name: string;
  initial_sort_key: string | null;
}

export interface CollectConfigRow {
  id: number;
  table_name: string;
  sequence: number;
  column_name: string;
  column_type: string;
  display: number;
  initial_sort_key: number;
  filter: number;
}

export async function getCollectApps(): Promise<CollectApp[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collect_apps")
    .select("*")
    .order("app", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CollectApp[];
}

export async function getCollectConfigByApp(app: string): Promise<CollectConfigRow[]> {
  if (!ALLOWED_APPS.includes(app as CollectAppName)) {
    throw new Error(`Invalid collect app: ${app}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collect_config")
    .select("*")
    .eq("table_name", app)
    .order("sequence", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CollectConfigRow[];
}

export async function getCollectAppRows(app: string): Promise<Record<string, unknown>[]> {
  const table = app as CollectAppName;
  if (!ALLOWED_APPS.includes(table)) {
    throw new Error(`Invalid collect app: ${app}`);
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from(table).select("*").order("id", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function getInitialSortKey(app: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collect_apps")
    .select("initial_sort_key")
    .eq("app", app)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.initial_sort_key ?? null;
}
