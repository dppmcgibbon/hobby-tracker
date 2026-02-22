/**
 * Sync miniature-photos storage bucket from local Supabase to remote.
 * Run after push-local-to-remote.sh so images work on the remote project.
 *
 * Requires:
 *   - Local Supabase running (npm run supabase:start)
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (remote)
 *
 * Local URL and service role key are read from `supabase status` so the correct
 * local JWT is used (do not use your remote service key for local – it causes "Invalid Compact JWS").
 */

import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BUCKET = "miniature-photos";

function getLocalKeys(): { url: string; serviceRoleKey: string } {
  try {
    const out = execSync("supabase status -o env", { encoding: "utf-8", maxBuffer: 1024 * 1024 });
    const apiUrlMatch = out.match(/API_URL="?([^"\n]+)"?/m);
    const keyMatch = out.match(/SERVICE_ROLE_KEY="?([^"\n]+)"?/m);
    const url = apiUrlMatch?.[1]?.trim() ?? process.env.LOCAL_SUPABASE_URL ?? "http://127.0.0.1:54321";
    const key = keyMatch?.[1]?.trim() ?? process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      console.error("Could not read SERVICE_ROLE_KEY from supabase status. Is Supabase running? Run: npm run supabase:start");
      process.exit(1);
    }
    return { url, serviceRoleKey: key };
  } catch (e) {
    console.error(
      "Failed to run supabase status. Start local Supabase first: npm run supabase:start\n",
      e instanceof Error ? e.message : e
    );
    process.exit(1);
  }
}

const remoteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remoteServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!remoteUrl || !remoteServiceKey) {
  console.error("Missing remote Supabase: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const { url: localUrl, serviceRoleKey: localServiceKey } = getLocalKeys();

const localSupabase = createClient(localUrl, localServiceKey);
const remoteSupabase = createClient(remoteUrl, remoteServiceKey);

type ListItem = { name: string; id?: string | null };

async function listAllPaths(prefix: string): Promise<string[]> {
  const { data, error } = await localSupabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    // Items with id are files; without are folder placeholders - list deeper
    if ((item as ListItem).id != null) {
      paths.push(path);
    } else {
      paths.push(...(await listAllPaths(path)));
    }
  }
  return paths;
}

async function main() {
  console.log("→ Listing all files in local miniature-photos bucket...");
  const paths = await listAllPaths("");
  console.log(`  Found ${paths.length} files`);
  if (paths.length === 0) {
    console.log("  Nothing to sync.");
    return;
  }

  let done = 0;
  let errors = 0;
  for (const storagePath of paths) {
    try {
      const { data: blob, error: downError } = await localSupabase.storage.from(BUCKET).download(storagePath);
      if (downError || !blob) {
        console.warn(`  Skip ${storagePath}: ${downError?.message ?? "no data"}`);
        errors++;
        continue;
      }
      const { error: upError } = await remoteSupabase.storage.from(BUCKET).upload(storagePath, blob, {
        contentType: blob.type || "application/octet-stream",
        upsert: true,
      });
      if (upError) {
        console.warn(`  Upload failed ${storagePath}: ${upError.message}`);
        errors++;
        continue;
      }
      done++;
      if (done % 50 === 0) console.log(`  Uploaded ${done}/${paths.length}...`);
    } catch (e) {
      console.warn(`  Error ${storagePath}:`, e);
      errors++;
    }
  }

  console.log(`\n✅ Done. Uploaded ${done} files${errors ? `, ${errors} errors` : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
