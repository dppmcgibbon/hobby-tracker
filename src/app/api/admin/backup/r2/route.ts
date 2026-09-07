import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import {
  getMiniatureBackupParts,
  getGameBackupGroups,
  streamR2FilesToArchive,
  R2FileItem,
} from "@/lib/backup/r2-backup";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes streaming for large R2 downloads

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "miniatures" | "games"
    const part = searchParams.get("part"); // "1" | "2" | "3" | "4" | "all"
    const game = searchParams.get("game"); // gameKey or "all"

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (type === "miniatures") {
      const { parts } = await getMiniatureBackupParts();

      let targetItems: R2FileItem[] = [];
      let filename = `hobby-tracker-miniatures-backup-${timestamp}.zip`;
      let partLabel = "All Parts";

      if (part && part !== "all") {
        const partNum = parseInt(part, 10);
        const selectedPart = parts.find((p) => p.partNumber === partNum);
        if (!selectedPart) {
          return NextResponse.json({ error: `Invalid part number: ${part}` }, { status: 400 });
        }
        targetItems = selectedPart.items;
        filename = `hobby-tracker-miniatures-part-${partNum}-of-${selectedPart.totalParts}-${timestamp}.zip`;
        partLabel = `Part ${partNum} of ${selectedPart.totalParts}`;
      } else {
        // All parts combined
        targetItems = parts.flatMap((p) => p.items);
        filename = `hobby-tracker-miniatures-all-${timestamp}.zip`;
      }

      const passThrough = new PassThrough();
      const archive = new ZipArchive({
        store: true, // Do not compress already-compressed images for high streaming performance
      });

      archive.pipe(passThrough);

      // Async streaming worker
      (async () => {
        try {
          const manifest = {
            exportDate: now.toISOString(),
            type: "miniatures",
            part: partLabel,
            fileCount: targetItems.length,
            totalBytes: targetItems.reduce((s, i) => s + i.size, 0),
            files: targetItems.map((i) => ({ key: i.key, size: i.size })),
          };

          archive.append(JSON.stringify(manifest, null, 2), {
            name: "manifest.json",
          });

          const itemsToStream = targetItems.map((item) => ({
            key: item.key,
            zipPath: item.key, // Preserves {userId}/{miniatureId}/{filename} structure
          }));

          await streamR2FilesToArchive(itemsToStream, archive);
        } catch (err) {
          console.error("Error streaming miniature images archive:", err);
          archive.destroy(err as Error);
        }
      })();

      const webStream = Readable.toWeb(passThrough) as ReadableStream;
      return new Response(webStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (type === "games") {
      const { groups } = await getGameBackupGroups();

      let targetItems: { key: string; zipPath: string }[] = [];
      let filename = `hobby-tracker-games-backup-${timestamp}.zip`;
      let groupName = "All Games";

      if (game && game !== "all") {
        const selectedGroup = groups.find((g) => g.gameKey === game);
        if (!selectedGroup) {
          return NextResponse.json({ error: `Game group not found: ${game}` }, { status: 400 });
        }
        groupName = selectedGroup.gameName;
        filename = `hobby-tracker-game-${selectedGroup.gameKey}-${timestamp}.zip`;

        targetItems = selectedGroup.items.map((item) => {
          // Flatten game folder cleanly
          const relPath = item.key.replace(/^games\//, "");
          return {
            key: item.key,
            zipPath: `${selectedGroup.gameName}/${relPath}`,
          };
        });
      } else {
        // All games
        filename = `hobby-tracker-games-all-${timestamp}.zip`;
        for (const grp of groups) {
          for (const item of grp.items) {
            const relPath = item.key.replace(/^games\//, "");
            targetItems.push({
              key: item.key,
              zipPath: `${grp.gameName}/${relPath}`,
            });
          }
        }
      }

      const passThrough = new PassThrough();
      const archive = new ZipArchive({
        store: true, // PDFs and images are already compressed; store mode prevents CPU choke
      });

      archive.pipe(passThrough);

      (async () => {
        try {
          const manifest = {
            exportDate: now.toISOString(),
            type: "game_assets",
            group: groupName,
            fileCount: targetItems.length,
            files: targetItems.map((i) => i.zipPath),
          };

          archive.append(JSON.stringify(manifest, null, 2), {
            name: "manifest.json",
          });

          await streamR2FilesToArchive(targetItems, archive);
        } catch (err) {
          console.error("Error streaming games archive:", err);
          archive.destroy(err as Error);
        }
      })();

      const webStream = Readable.toWeb(passThrough) as ReadableStream;
      return new Response(webStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid backup type. Supported: 'miniatures' or 'games'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in R2 backup route:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create R2 backup" },
      { status: 500 }
    );
  }
}
