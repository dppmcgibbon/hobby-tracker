"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CSVRow {
  name: string;
  faction?: string;
  unit_type?: string;
  quantity?: string;
  material?: string;
  base_size?: string;
  sculptor?: string;
  year?: string;
  notes?: string;
  storage_box?: string;
  status?: string;
  game?: string;
  edition?: string;
  expansion?: string;
}

export async function importMiniaturesFromCSV(csvContent: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  try {
    // Parse CSV
    const lines = csvContent.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    // Fetch reference data for mapping
    const [{ data: factions }, { data: storageBoxes }, { data: statuses }, { data: games }] = await Promise.all([
      supabase.from("factions").select("id, name"),
      supabase.from("storage_boxes").select("id, name").eq("user_id", user.id),
      supabase.from("miniature_statuses").select("id, name").order("display_order"),
      supabase.from("games").select("id, name"),
    ]);

    // Create mappings
    const factionMap = new Map((factions || []).map((f) => [f.name.toLowerCase(), f.id]));
    const storageMap = new Map((storageBoxes || []).map((s) => [s.name.toLowerCase(), s.id]));
    const statusMap = new Map((statuses || []).map((s) => [s.name.toLowerCase(), s.id]));
    const gameMap = new Map((games || []).map((g) => [g.name.toLowerCase(), g.id]));

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Import each row
    for (const row of rows) {
      try {
        if (!row.name) {
          errors.push(`Row ${successCount + errorCount + 1}: Name is required`);
          errorCount++;
          continue;
        }

        // Map faction
        let factionId = null;
        if (row.faction) {
          factionId = factionMap.get(row.faction.toLowerCase()) || null;
        }

        // Map storage box
        let storageBoxId = null;
        if (row.storage_box) {
          storageBoxId = storageMap.get(row.storage_box.toLowerCase()) || null;
        }

        // Map status
        let statusName = (row.status || "backlog").toLowerCase();
        const statusId = statusMap.get(statusName) || null;

        // Parse quantity
        const quantity = row.quantity ? parseInt(row.quantity) : 1;

        // Parse year
        const year = row.year ? parseInt(row.year) : null;

        // Insert miniature
        const { data: miniature, error: miniatureError } = await supabase
          .from("miniatures")
          .insert({
            name: row.name,
            faction_id: factionId,
            unit_type: row.unit_type || null,
            quantity: quantity,
            material: row.material || null,
            base_size: row.base_size || null,
            sculptor: row.sculptor || "Unknown",
            year: year,
            notes: row.notes || null,
            storage_box_id: storageBoxId,
            user_id: user.id,
          })
          .select()
          .single();

        if (miniatureError) {
          errors.push(`Row ${successCount + errorCount + 1} (${row.name}): ${miniatureError.message}`);
          errorCount++;
          continue;
        }

        // Insert status
        if (miniature && statusId) {
          await supabase.from("miniature_status").insert({
            miniature_id: miniature.id,
            user_id: user.id,
            status_id: statusId,
          });
        }

        // Link game/edition/expansion if provided
        if (miniature && row.game) {
          const gameId = gameMap.get(row.game.toLowerCase());
          if (gameId) {
            let editionId = null;
            let expansionId = null;

            // Get edition if specified
            if (row.edition) {
              const { data: editions } = await supabase
                .from("editions")
                .select("id, name")
                .eq("game_id", gameId);
              
              const editionMatch = editions?.find(
                (e) => e.name.toLowerCase() === row.edition!.toLowerCase()
              );
              editionId = editionMatch?.id || null;
            }

            // Get expansion if specified (requires edition)
            if (row.expansion && editionId) {
              const { data: expansions } = await supabase
                .from("expansions")
                .select("id, name")
                .eq("edition_id", editionId);
              
              const expansionMatch = expansions?.find(
                (e) => e.name.toLowerCase() === row.expansion!.toLowerCase()
              );
              expansionId = expansionMatch?.id || null;
            }

            // Link to game
            await supabase.from("miniature_games").insert({
              miniature_id: miniature.id,
              game_id: gameId,
              edition_id: editionId,
              expansion_id: expansionId,
            });
          }
        }

        successCount++;
      } catch (error) {
        errors.push(
          `Row ${successCount + errorCount + 1} (${row.name}): ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        errorCount++;
      }
    }

    revalidatePath("/dashboard/collection");

    return {
      success: true,
      successCount,
      errorCount,
      errors,
    };
  } catch (error) {
    console.error("CSV import error:", error);
    throw error;
  }
}
