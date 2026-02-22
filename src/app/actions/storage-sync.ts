"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "miniature-photos";

type ListItem = { name: string; id?: string | null };

/** Minimal type so both createClient (local) and createServiceRoleClient (remote) are accepted. */
type StorageClient = {
  storage: {
    from: (bucket: string) => {
      list: (prefix: string, options?: { limit?: number }) => Promise<{ data: unknown; error: Error | null }>;
      download: (path: string) => Promise<{ data: Blob | null; error: Error | null }>;
      upload: (path: string, body: Blob, options?: { contentType?: string; upsert?: boolean }) => Promise<{ error: Error | null }>;
    };
  };
};

async function listAllPaths(supabase: StorageClient, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  const items = (Array.isArray(data) ? data : []) as ListItem[];
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id != null) {
      paths.push(path);
    } else {
      paths.push(...(await listAllPaths(supabase, path)));
    }
  }
  return paths;
}

export type SyncPhotosOnlyResult =
  | { success: true; uploaded: number; errors: number; total: number }
  | { success: false; message: string };

/**
 * Sync miniature-photos bucket from local Supabase to current (remote) project.
 * No database rows are changed — only storage files are copied.
 * Only works when running the app locally with LOCAL_SUPABASE_URL and LOCAL_SUPABASE_SERVICE_ROLE_KEY set.
 */
export async function syncPhotosOnly(): Promise<SyncPhotosOnlyResult> {
  await requireAuth();

  const localUrl = process.env.LOCAL_SUPABASE_URL;
  const localKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!localUrl || !localKey) {
    return {
      success: false,
      message:
        "Photos-only sync is only available when running the app locally. Set LOCAL_SUPABASE_URL and LOCAL_SUPABASE_SERVICE_ROLE_KEY in .env.local (get the key from: supabase status).",
    };
  }

  const remote = createServiceRoleClient();
  const local = createClient(localUrl, localKey, { auth: { persistSession: false } });

  try {
    const paths = await listAllPaths(local, "");
    if (paths.length === 0) {
      return { success: true, uploaded: 0, errors: 0, total: 0 };
    }

    let uploaded = 0;
    let errors = 0;
    for (const storagePath of paths) {
      try {
        const { data: blob, error: downError } = await local.storage.from(BUCKET).download(storagePath);
        if (downError || !blob) {
          errors++;
          continue;
        }
        const { error: upError } = await remote.storage.from(BUCKET).upload(storagePath, blob, {
          contentType: blob.type || "application/octet-stream",
          upsert: true,
        });
        if (upError) {
          errors++;
          continue;
        }
        uploaded++;
      } catch {
        errors++;
      }
    }

    return { success: true, uploaded, errors, total: paths.length };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
