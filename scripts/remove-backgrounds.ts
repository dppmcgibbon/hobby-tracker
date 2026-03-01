/**
 * Batch script: remove background from all (or filtered) miniature photos in Supabase.
 * Requires REMOVE_BG_API_KEY and Supabase credentials in .env.local.
 *
 * Usage:
 *   npx tsx scripts/remove-backgrounds.ts           # all photos
 *   npx tsx scripts/remove-backgrounds.ts --limit 10
 *   npx tsx scripts/remove-backgrounds.ts --miniature-id <uuid>
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { removeBackgroundFromBuffer } from "../src/lib/background-removal";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.REMOVE_BG_API_KEY;

if (!apiKey) {
  console.error("Missing REMOVE_BG_API_KEY in .env.local. Get a key at https://www.remove.bg/api");
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET = "miniature-photos";

function parseArgs(): { limit?: number; miniatureId?: string } {
  const args = process.argv.slice(2);
  const out: { limit?: number; miniatureId?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      out.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--miniature-id" && args[i + 1]) {
      out.miniatureId = args[i + 1];
      i++;
    }
  }
  return out;
}

async function main() {
  const { limit, miniatureId } = parseArgs();

  let query = supabase.from("miniature_photos").select("id, storage_path");
  if (miniatureId) {
    query = query.eq("miniature_id", miniatureId);
  }
  query = query.order("uploaded_at", { ascending: true });
  if (limit != null && limit > 0) {
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Failed to fetch photos:", error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log("No photos to process.");
    return;
  }

  console.log(`Processing ${rows.length} photo(s)...`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const path = row.storage_path as string;
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(path);

      if (downloadError || !blob) {
        console.error(`[${i + 1}/${rows.length}] Skip ${path}: ${downloadError?.message ?? "download failed"}`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const mimeType = blob.type || "image/jpeg";
      const pngBuffer = await removeBackgroundFromBuffer(buffer, mimeType);

      if (!pngBuffer) {
        console.error(`[${i + 1}/${rows.length}] Skip ${path}: removal returned null`);
        failed++;
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, pngBuffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error(`[${i + 1}/${rows.length}] Skip ${path}: ${uploadError.message}`);
        failed++;
        continue;
      }

      processed++;
      console.log(`[${i + 1}/${rows.length}] OK ${path}`);
    } catch (err) {
      console.error(`[${i + 1}/${rows.length}] Error ${path}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`Done. Processed: ${processed}, failed: ${failed}`);
}

main();
