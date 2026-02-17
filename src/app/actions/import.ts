"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CSVRow {
  name: string;
  unit_type?: string;
  quantity?: string;
  material?: string;
  base_size?: string;
  sculptor?: string;
  year?: string;
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
    const { data: statuses } = await supabase
      .from("miniature_statuses")
      .select("id, name")
      .order("display_order");

    // Get the default backlog status
    const statusMap = new Map((statuses || []).map((s) => [s.name.toLowerCase(), s.id]));
    const defaultStatusId = statusMap.get("backlog") || null;

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

        // Parse quantity
        const quantity = row.quantity ? parseInt(row.quantity) : 1;

        // Parse year
        const year = row.year ? parseInt(row.year) : null;

        // Insert miniature
        const { data: miniature, error: miniatureError } = await supabase
          .from("miniatures")
          .insert({
            name: row.name,
            faction_id: null,
            unit_type: row.unit_type || null,
            quantity: quantity,
            material: row.material || null,
            base_size: row.base_size || null,
            sculptor: row.sculptor || "Unknown",
            year: year,
            user_id: user.id,
          })
          .select()
          .single();

        if (miniatureError) {
          errors.push(`Row ${successCount + errorCount + 1} (${row.name}): ${miniatureError.message}`);
          errorCount++;
          continue;
        }

        // Insert default status (backlog)
        if (miniature && defaultStatusId) {
          await supabase.from("miniature_status").insert({
            miniature_id: miniature.id,
            user_id: user.id,
            status_id: defaultStatusId,
          });
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
