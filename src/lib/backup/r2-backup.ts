import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ZipArchive } from "archiver";
import { Readable } from "stream";

export interface R2FileItem {
  key: string;
  size: number;
  lastModified?: Date;
}

export interface MiniaturePartInfo {
  partNumber: number;
  totalParts: number;
  itemCount: number;
  totalBytes: number;
  items: R2FileItem[];
}

export interface GameGroupInfo {
  gameName: string;
  gameKey: string; // slug / safe identifier
  itemCount: number;
  totalBytes: number;
  pdfCount: number;
  imageCount: number;
  items: R2FileItem[];
}

/**
 * Fetches all objects in the R2 bucket with pagination (using ContinuationToken).
 */
export async function listAllR2Objects(prefix?: string): Promise<R2FileItem[]> {
  const allItems: R2FileItem[] = [];
  let isTruncated = true;
  let continuationToken: string | undefined;

  while (isTruncated) {
    const response = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents || []) {
      if (item.Key && !item.Key.endsWith("/")) {
        allItems.push({
          key: item.Key,
          size: item.Size || 0,
          lastModified: item.LastModified,
        });
      }
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return allItems;
}

/**
 * Splits miniature images into balanced parts (approx 450-500 images / ~300-400 MB each).
 */
export async function getMiniatureBackupParts(): Promise<{
  parts: MiniaturePartInfo[];
  totalCount: number;
  totalBytes: number;
}> {
  const allObjects = await listAllR2Objects();

  // Miniature photos are stored under user UUID prefixes: {userId}/{miniatureId}/...
  // Exclude games/ and shortcuts/
  const miniatureObjects = allObjects.filter(
    (item) => !item.key.startsWith("games/") && !item.key.startsWith("shortcuts/")
  );

  // Sort deterministically by key
  miniatureObjects.sort((a, b) => a.key.localeCompare(b.key));

  const totalCount = miniatureObjects.length;
  const totalBytes = miniatureObjects.reduce((acc, item) => acc + item.size, 0);

  // Dynamically scale parts: target ~350MB per volume to ensure fast, reliable downloads
  const TARGET_BYTES_PER_PART = 350 * 1024 * 1024;
  const totalPartsCount = Math.max(1, Math.ceil(totalBytes / TARGET_BYTES_PER_PART));

  const chunkSize = Math.ceil(totalCount / totalPartsCount);
  const parts: MiniaturePartInfo[] = [];

  for (let i = 0; i < totalPartsCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalCount);
    const slice = miniatureObjects.slice(start, end);

    if (slice.length > 0) {
      parts.push({
        partNumber: i + 1,
        totalParts: totalPartsCount,
        itemCount: slice.length,
        totalBytes: slice.reduce((sum, item) => sum + item.size, 0),
        items: slice,
      });
    }
  }

  return { parts, totalCount, totalBytes };
}

/**
 * Groups game PDFs and game images by game system (Necromunda, Kill Team, Blood Bowl, etc.).
 */
export async function getGameBackupGroups(): Promise<{
  groups: GameGroupInfo[];
  totalCount: number;
  totalBytes: number;
  allGameItems: R2FileItem[];
}> {
  const allGameItems = await listAllR2Objects("games/");
  const supabase = createServiceRoleClient();

  const [gamesRes, editionsRes, expansionsRes] = await Promise.all([
    supabase.from("games").select("id, name"),
    supabase.from("editions").select("id, name, game_id"),
    supabase.from("expansions").select("id, name, edition_id"),
  ]);

  const gameMap = new Map((gamesRes.data || []).map((g) => [g.id, g.name]));
  const editionMap = new Map(
    (editionsRes.data || []).map((e) => [e.id, { name: e.name, gameId: e.game_id }])
  );
  const expansionMap = new Map(
    (expansionsRes.data || []).map((x) => [x.id, { name: x.name, editionId: x.edition_id }])
  );

  // First pass: identify entity names from database
  const entityGameMap = new Map<string, string>();

  // Helper to resolve entity to game name
  const resolveEntityName = (entityType: string, entityId: string): string | null => {
    if (entityType === "game") {
      return gameMap.get(entityId) || null;
    }
    if (entityType === "edition") {
      const ed = editionMap.get(entityId);
      if (ed) return gameMap.get(ed.gameId) || ed.name;
    }
    if (entityType === "expansion") {
      const exp = expansionMap.get(entityId);
      if (exp) {
        const ed = editionMap.get(exp.editionId);
        if (ed) return gameMap.get(ed.gameId) || ed.name;
        return exp.name;
      }
    }
    return null;
  };

  // Pre-seed known heuristics for entity IDs with matching filenames
  for (const item of allGameItems) {
    const parts = item.key.split("/");
    const entityType = parts[1];
    const entityId = parts[2];
    if (entityId && !entityGameMap.has(entityId)) {
      const fromDb = resolveEntityName(entityType, entityId);
      if (fromDb) {
        entityGameMap.set(entityId, fromDb);
      } else {
        const lowerKey = item.key.toLowerCase();
        if (lowerKey.includes("necromunda")) entityGameMap.set(entityId, "Necromunda");
        else if (lowerKey.includes("kill_team") || lowerKey.includes("kill team"))
          entityGameMap.set(entityId, "Kill Team");
        else if (lowerKey.includes("blood_bowl") || lowerKey.includes("blood bowl"))
          entityGameMap.set(entityId, "Blood Bowl");
        else if (lowerKey.includes("space_hulk") || lowerKey.includes("space hulk"))
          entityGameMap.set(entityId, "Space Hulk");
        else if (lowerKey.includes("heroquest")) entityGameMap.set(entityId, "HeroQuest");
        else if (lowerKey.includes("miskatonic")) entityGameMap.set(entityId, "Miskatonic Tales");
      }
    }
  }

  const grouped = new Map<string, R2FileItem[]>();

  for (const item of allGameItems) {
    const parts = item.key.split("/");
    const entityId = parts[2];
    let resolvedName = (entityId && entityGameMap.get(entityId)) || "General Game Assets";

    // Extra fallback check if still unresolved
    if (resolvedName === "General Game Assets") {
      const lower = item.key.toLowerCase();
      if (lower.includes("necromunda")) resolvedName = "Necromunda";
      else if (lower.includes("kill_team") || lower.includes("kill team"))
        resolvedName = "Kill Team";
      else if (lower.includes("blood_bowl") || lower.includes("blood bowl"))
        resolvedName = "Blood Bowl";
      else if (lower.includes("space_hulk") || lower.includes("space hulk"))
        resolvedName = "Space Hulk";
      else if (lower.includes("heroquest")) resolvedName = "HeroQuest";
      else if (lower.includes("miskatonic")) resolvedName = "Miskatonic Tales";
    }

    if (!grouped.has(resolvedName)) {
      grouped.set(resolvedName, []);
    }
    grouped.get(resolvedName)!.push(item);
  }

  const groups: GameGroupInfo[] = [];

  for (const [gameName, items] of grouped.entries()) {
    items.sort((a, b) => a.key.localeCompare(b.key));
    const gameKey = gameName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const pdfCount = items.filter((i) => i.key.toLowerCase().endsWith(".pdf")).length;
    const imageCount = items.length - pdfCount;
    const totalBytes = items.reduce((sum, i) => sum + i.size, 0);

    groups.push({
      gameName,
      gameKey,
      itemCount: items.length,
      totalBytes,
      pdfCount,
      imageCount,
      items,
    });
  }

  // Sort groups descending by size
  groups.sort((a, b) => b.totalBytes - a.totalBytes);

  const totalCount = allGameItems.length;
  const totalBytes = allGameItems.reduce((acc, i) => acc + i.size, 0);

  return { groups, totalCount, totalBytes, allGameItems };
}

/**
 * Streams files from Cloudflare R2 into an archiver ZIP stream.
 * Sequential streaming prevents saturating network bandwidth or exceeding memory buffers.
 */
export async function streamR2FilesToArchive(
  items: { key: string; zipPath: string }[],
  archive: ZipArchive
): Promise<void> {
  for (const item of items) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: item.key,
      });

      const response = await r2Client.send(command);
      if (response.Body) {
        // response.Body is a Node Readable in Node.js runtime
        const stream = response.Body as unknown as Readable;
        archive.append(stream, { name: item.zipPath });
      }
    } catch (err) {
      console.error(`Failed to stream R2 object ${item.key} into ZIP:`, err);
      // Append a small placeholder error log inside the zip for transparency
      archive.append(`Failed to download ${item.key}: ${(err as Error).message}`, {
        name: `errors/${item.zipPath}.error.txt`,
      });
    }
  }

  await archive.finalize();
}
