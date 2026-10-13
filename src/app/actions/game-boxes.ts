"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminSupabase() {
  await requireAuth();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }
  return await createClient();
}

export interface GameBoxInput {
  name: string;
  game_id: string;
  edition_id?: string | null;
  expansion_id?: string | null;
  box_type?: string;
  condition?: string | null;
  location?: string | null;
  barcode?: string | null;
  notes?: string | null;
}

export async function createGameBox(data: GameBoxInput) {
  const supabase = await getAdminSupabase();

  if (!data.name?.trim()) {
    throw new Error("Box name is required");
  }
  if (!data.game_id) {
    throw new Error("Game is required");
  }

  // Hierarchy validation
  if (data.expansion_id && !data.edition_id) {
    throw new Error("An edition must be specified if an expansion is selected");
  }

  const payload = {
    name: data.name.trim(),
    game_id: data.game_id,
    edition_id: data.edition_id || null,
    expansion_id: data.expansion_id || null,
    box_type: data.box_type?.trim() || "core",
    condition: data.condition?.trim() || "good",
    location: data.location?.trim() || null,
    barcode: data.barcode?.trim() || null,
    notes: data.notes?.trim() || null,
  };

  const { data: box, error } = await supabase.from("game_boxes").insert(payload).select().single();

  if (error) {
    throw new Error(`Failed to create game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, box };
}

export async function updateGameBox(id: string, data: Partial<GameBoxInput>) {
  const supabase = await getAdminSupabase();

  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error("Box name is required");
    payload.name = data.name.trim();
  }
  if (data.game_id !== undefined) payload.game_id = data.game_id;
  if (data.edition_id !== undefined) payload.edition_id = data.edition_id || null;
  if (data.expansion_id !== undefined) payload.expansion_id = data.expansion_id || null;
  if (data.box_type !== undefined) payload.box_type = data.box_type?.trim() || "core";
  if (data.condition !== undefined) payload.condition = data.condition?.trim() || null;
  if (data.location !== undefined) payload.location = data.location?.trim() || null;
  if (data.barcode !== undefined) payload.barcode = data.barcode?.trim() || null;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data: box, error } = await supabase
    .from("game_boxes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, box };
}

export async function deleteGameBox(id: string) {
  const supabase = await getAdminSupabase();

  // Find components with image_storage_path to clean up R2
  const { data: components } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("game_box_id", id);

  if (components) {
    const { deleteR2Object } = await import("@/lib/r2");
    for (const comp of components) {
      if (comp.image_storage_path) {
        try {
          await deleteR2Object(comp.image_storage_path);
        } catch (e) {
          console.warn("Failed to delete component image from R2:", e);
        }
      }
    }
  }

  const { error } = await supabase.from("game_boxes").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete game box: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true };
}

export async function duplicateGameBox(sourceBoxId: string, newName: string) {
  const supabase = await getAdminSupabase();

  if (!newName?.trim()) {
    throw new Error("New box name is required");
  }

  // 1. Fetch the source box
  const { data: sourceBox, error: fetchBoxErr } = await supabase
    .from("game_boxes")
    .select("*")
    .eq("id", sourceBoxId)
    .single();

  if (fetchBoxErr || !sourceBox) {
    throw new Error("Source game box not found");
  }

  // 2. Insert new box
  const newBoxPayload = {
    name: newName.trim(),
    game_id: sourceBox.game_id,
    edition_id: sourceBox.edition_id,
    expansion_id: sourceBox.expansion_id,
    box_type: sourceBox.box_type,
    condition: sourceBox.condition,
    location: sourceBox.location,
    barcode: sourceBox.barcode,
    notes: sourceBox.notes,
  };

  const { data: newBox, error: insertBoxErr } = await supabase
    .from("game_boxes")
    .insert(newBoxPayload)
    .select()
    .single();

  if (insertBoxErr || !newBox) {
    throw new Error(`Failed to duplicate game box: ${insertBoxErr?.message}`);
  }

  // 3. Fetch all components belonging to the source box
  const { data: sourceComponents, error: fetchComponentsErr } = await supabase
    .from("game_components")
    .select("*")
    .eq("game_box_id", sourceBoxId);

  if (fetchComponentsErr) {
    console.warn("Failed to fetch source components:", fetchComponentsErr);
  }

  if (sourceComponents && sourceComponents.length > 0) {
    const { copyR2Object } = await import("@/lib/r2");

    for (const comp of sourceComponents) {
      // 4. Create new component record in database
      const newCompPayload = {
        game_box_id: newBox.id,
        name: comp.name,
        component_type: comp.component_type,
        quantity_expected: comp.quantity_expected,
        quantity_actual: comp.quantity_actual,
        status: comp.status,
        description: comp.description,
        notes: comp.notes,
        image_storage_path: null as string | null,
        image_updated_at: comp.image_updated_at,
      };

      const { data: newComp, error: insertCompErr } = await supabase
        .from("game_components")
        .insert(newCompPayload)
        .select()
        .single();

      if (insertCompErr || !newComp) {
        console.warn(`Failed to duplicate component ${comp.name}:`, insertCompErr);
        continue;
      }

      // 5. Duplicate photos
      let sourcePhotos: any[] = [];
      try {
        const { data: photos, error: photosErr } = await supabase
          .from("game_component_photos")
          .select("*")
          .eq("component_id", comp.id)
          .order("display_order", { ascending: true })
          .order("uploaded_at", { ascending: true });

        if (!photosErr && photos) {
          sourcePhotos = photos;
        }
      } catch {
        // Table may not exist yet in schema cache
      }

      let primaryCopiedPath: string | null = null;
      const now = new Date().toISOString();

      if (sourcePhotos.length > 0) {
        for (let i = 0; i < sourcePhotos.length; i++) {
          const photo = sourcePhotos[i];
          if (!photo.storage_path) continue;

          try {
            // Generate clean target R2 key
            const cleanPath = photo.storage_path.split("/").pop() || `photo-${i}.jpg`;
            const cleanFilename = cleanPath.replace(/[^a-zA-Z0-9._-]/g, "_");
            const targetKey = `components/${newComp.id}/${Date.now()}-${i}-${cleanFilename}`;

            await copyR2Object(photo.storage_path, targetKey);

            if (!primaryCopiedPath) {
              primaryCopiedPath = targetKey;
            }

            // Insert into game_component_photos
            try {
              await supabase.from("game_component_photos").insert({
                component_id: newComp.id,
                storage_path: targetKey,
                caption: photo.caption,
                display_order: photo.display_order ?? i,
                uploaded_at: now,
                image_updated_at: now,
              });
            } catch (err) {
              console.warn("Could not insert duplicated photo row:", err);
            }
          } catch (err) {
            console.warn(`Failed to copy photo ${photo.storage_path} to R2:`, err);
          }
        }
      } else if (comp.image_storage_path) {
        // Legacy single photo
        try {
          const cleanPath = comp.image_storage_path.split("/").pop() || "image.jpg";
          const cleanFilename = cleanPath.replace(/[^a-zA-Z0-9._-]/g, "_");
          const targetKey = `components/${newComp.id}/${Date.now()}-${cleanFilename}`;

          await copyR2Object(comp.image_storage_path, targetKey);
          primaryCopiedPath = targetKey;

          // Also try inserting into game_component_photos if table exists
          try {
            await supabase.from("game_component_photos").insert({
              component_id: newComp.id,
              storage_path: targetKey,
              display_order: 0,
              uploaded_at: now,
              image_updated_at: now,
            });
          } catch {
            // Ignore if table does not exist
          }
        } catch (err) {
          console.warn(`Failed to copy component image ${comp.image_storage_path} to R2:`, err);
        }
      }

      // Update new component with primaryCopiedPath if any was copied
      if (primaryCopiedPath) {
        await supabase
          .from("game_components")
          .update({
            image_storage_path: primaryCopiedPath,
            image_updated_at: now,
            updated_at: now,
          })
          .eq("id", newComp.id);
      }
    }
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin");

  return { success: true, box: newBox };
}
