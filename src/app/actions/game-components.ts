"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uploadR2Object, deleteR2Object, copyR2Object } from "@/lib/r2";
import type { GameComponentPhoto } from "@/types";

async function getAdminSupabase() {
  await requireAuth();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }
  return await createClient();
}

export interface GameComponentInput {
  game_box_id: string;
  name: string;
  component_type?: string;
  quantity_expected?: number;
  quantity_actual?: number;
  status?: string;
  description?: string | null;
  notes?: string | null;
}

export async function createGameComponent(data: GameComponentInput) {
  const supabase = await getAdminSupabase();

  if (!data.name?.trim()) {
    throw new Error("Component name is required");
  }
  if (!data.game_box_id) {
    throw new Error("Game box is required");
  }

  const payload = {
    game_box_id: data.game_box_id,
    name: data.name.trim(),
    component_type: data.component_type?.trim() || "other",
    quantity_expected:
      typeof data.quantity_expected === "number" ? Math.max(0, data.quantity_expected) : 0,
    quantity_actual:
      typeof data.quantity_actual === "number" ? Math.max(0, data.quantity_actual) : 0,
    status: data.status?.trim() || "complete",
    description: data.description?.trim() || null,
    notes: data.notes?.trim() || null,
  };

  const { data: component, error } = await supabase
    .from("game_components")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, component };
}

export async function updateGameComponent(id: string, data: Partial<GameComponentInput>) {
  const supabase = await getAdminSupabase();

  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error("Component name is required");
    payload.name = data.name.trim();
  }
  if (data.game_box_id !== undefined) payload.game_box_id = data.game_box_id;
  if (data.component_type !== undefined)
    payload.component_type = data.component_type.trim() || "other";
  if (data.quantity_expected !== undefined)
    payload.quantity_expected = Math.max(0, data.quantity_expected);
  if (data.quantity_actual !== undefined)
    payload.quantity_actual = Math.max(0, data.quantity_actual);
  if (data.status !== undefined) payload.status = data.status.trim() || "complete";
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data: component, error } = await supabase
    .from("game_components")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true, component };
}

export async function deleteGameComponent(id: string) {
  const supabase = await getAdminSupabase();

  // Clean up any R2 images from game_component_photos
  try {
    const { data: photos } = await supabase
      .from("game_component_photos")
      .select("storage_path")
      .eq("component_id", id);
    if (photos && photos.length > 0) {
      for (const p of photos) {
        if (p.storage_path) {
          try {
            await deleteR2Object(p.storage_path);
          } catch (e) {
            console.warn("Failed to delete component photo from R2:", e);
          }
        }
      }
    }
  } catch {
    // If table doesn't exist yet, ignore
  }

  // Clean up any legacy R2 image
  const { data: current } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", id)
    .single();

  if (current?.image_storage_path) {
    try {
      await deleteR2Object(current.image_storage_path);
    } catch (e) {
      console.warn("Failed to delete component image from R2:", e);
    }
  }

  const { error } = await supabase.from("game_components").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete game component: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true };
}

export async function resetGameBoxActualQuantities(gameBoxId: string) {
  const supabase = await getAdminSupabase();

  if (!gameBoxId) {
    throw new Error("Game box ID is required");
  }

  const { error } = await supabase
    .from("game_components")
    .update({ quantity_actual: 0, updated_at: new Date().toISOString() })
    .eq("game_box_id", gameBoxId);

  if (error) {
    throw new Error(`Failed to reset actual quantities: ${error.message}`);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return { success: true };
}

// Deprecated alias kept for compatibility
export const resetGameBoxExpectedQuantities = resetGameBoxActualQuantities;

export async function getComponentPhotos(componentId: string) {
  const supabase = await getAdminSupabase();

  try {
    const { data: photos, error } = await supabase
      .from("game_component_photos")
      .select("*")
      .eq("component_id", componentId)
      .order("display_order", { ascending: true })
      .order("uploaded_at", { ascending: true });

    if (!error && photos && photos.length > 0) {
      return photos;
    }
  } catch {
    // Table may not exist yet, fall back below
  }

  // Fallback to legacy single photo on component
  const { data: comp } = await supabase
    .from("game_components")
    .select("id, image_storage_path, image_updated_at, created_at")
    .eq("id", componentId)
    .single();

  if (comp?.image_storage_path) {
    return [
      {
        id: comp.id,
        component_id: comp.id,
        storage_path: comp.image_storage_path,
        image_updated_at: comp.image_updated_at,
        display_order: 0,
        uploaded_at: comp.created_at,
        caption: null,
      },
    ];
  }

  return [];
}

export async function uploadComponentPhoto(componentId: string, formData: FormData) {
  const supabase = await getAdminSupabase();

  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No image file provided.");
  }

  const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `components/${componentId}/${timestamp}-${cleanFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { key: storagePath } = await uploadR2Object(key, buffer, file.type || "image/jpeg");
  const now = new Date().toISOString();

  let createdPhoto = null;

  try {
    // Find next display order
    const { data: lastPhotos } = await supabase
      .from("game_component_photos")
      .select("display_order")
      .eq("component_id", componentId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder =
      lastPhotos && lastPhotos.length > 0 && lastPhotos[0].display_order != null
        ? lastPhotos[0].display_order + 1
        : 0;

    const { data: inserted, error: insertErr } = await supabase
      .from("game_component_photos")
      .insert({
        component_id: componentId,
        storage_path: storagePath,
        display_order: nextOrder,
        uploaded_at: now,
        image_updated_at: now,
      })
      .select()
      .single();

    if (!insertErr && inserted) {
      createdPhoto = inserted;
    }
  } catch {
    // Fall back if table not created yet
  }

  // Also ensure game_components has image_storage_path set if it's empty or null
  const { data: comp } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (!comp?.image_storage_path) {
    await supabase
      .from("game_components")
      .update({
        image_storage_path: storagePath,
        image_updated_at: now,
        updated_at: now,
      })
      .eq("id", componentId);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true, photo: createdPhoto, storagePath };
}

export async function uploadComponentImage(componentId: string, formData: FormData) {
  return await uploadComponentPhoto(componentId, formData);
}

export async function replaceComponentPhotoWithBuffer(
  photoId: string,
  componentId: string,
  formData: FormData
) {
  const supabase = await getAdminSupabase();

  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("No image file provided.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const timestamp = Date.now();
  const now = new Date().toISOString();

  // Try finding in game_component_photos
  let photoRecord = null;
  try {
    const { data: p } = await supabase
      .from("game_component_photos")
      .select("*")
      .eq("id", photoId)
      .single();
    photoRecord = p;
  } catch {
    // Table might not exist yet
  }

  const storagePath =
    photoRecord?.storage_path || `components/${componentId}/${timestamp}-edited.png`;

  await uploadR2Object(storagePath, buffer, file.type || "image/png");

  if (photoRecord) {
    try {
      await supabase
        .from("game_component_photos")
        .update({
          storage_path: storagePath,
          image_updated_at: now,
        })
        .eq("id", photoId);
    } catch {
      // Ignore
    }
  }

  // Also check if component's primary image_storage_path needs updating
  const { data: comp } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (
    !comp?.image_storage_path ||
    comp.image_storage_path === storagePath ||
    photoId === componentId
  ) {
    await supabase
      .from("game_components")
      .update({
        image_storage_path: storagePath,
        image_updated_at: now,
        updated_at: now,
      })
      .eq("id", componentId);
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true };
}

export async function replaceComponentImageWithBuffer(componentId: string, formData: FormData) {
  return await replaceComponentPhotoWithBuffer(componentId, componentId, formData);
}

export async function deleteComponentPhoto(photoId: string, componentId: string) {
  const supabase = await getAdminSupabase();

  let storagePathToDelete: string | null = null;

  try {
    const { data: photo } = await supabase
      .from("game_component_photos")
      .select("storage_path")
      .eq("id", photoId)
      .single();
    if (photo?.storage_path) {
      storagePathToDelete = photo.storage_path;
    }
    await supabase.from("game_component_photos").delete().eq("id", photoId);
  } catch {
    // If table doesn't exist
  }

  // Check component's image_storage_path
  const { data: comp } = await supabase
    .from("game_components")
    .select("image_storage_path")
    .eq("id", componentId)
    .single();

  if (!storagePathToDelete && photoId === componentId) {
    storagePathToDelete = comp?.image_storage_path || null;
  }

  if (storagePathToDelete) {
    try {
      await deleteR2Object(storagePathToDelete);
    } catch (e) {
      console.warn("Failed to delete photo from R2:", e);
    }
  }

  // Find remaining photos to update game_components.image_storage_path
  let nextStoragePath: string | null = null;
  try {
    const { data: remaining } = await supabase
      .from("game_component_photos")
      .select("storage_path")
      .eq("component_id", componentId)
      .order("display_order", { ascending: true })
      .order("uploaded_at", { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      nextStoragePath = remaining[0].storage_path;
    }
  } catch {
    // If table doesn't exist
  }

  const now = new Date().toISOString();
  await supabase
    .from("game_components")
    .update({
      image_storage_path: nextStoragePath,
      image_updated_at: nextStoragePath ? now : null,
      updated_at: now,
    })
    .eq("id", componentId);

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true };
}

export async function deleteComponentImage(componentId: string) {
  return await deleteComponentPhoto(componentId, componentId);
}

export interface ComponentReorderItem {
  id: string;
  display_order: number;
  component_type?: string;
  game_box_id?: string;
}

export async function reorderGameComponents(items: ComponentReorderItem[]) {
  const supabase = await getAdminSupabase();

  if (!items || items.length === 0) {
    return { success: true };
  }

  const now = new Date().toISOString();

  for (const item of items) {
    const payload: Record<string, unknown> = {
      display_order: item.display_order,
      updated_at: now,
    };
    if (item.component_type !== undefined) {
      payload.component_type = item.component_type;
    }
    if (item.game_box_id !== undefined) {
      payload.game_box_id = item.game_box_id;
    }

    try {
      const { error } = await supabase.from("game_components").update(payload).eq("id", item.id);

      if (error) {
        // If display_order column doesn't exist yet, try without display_order
        if (item.component_type) {
          await supabase
            .from("game_components")
            .update({ component_type: item.component_type, updated_at: now })
            .eq("id", item.id);
        }
      }
    } catch (err) {
      console.warn("Could not reorder component:", err);
    }
  }

  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");

  return { success: true };
}

export interface DuplicateGameComponentOptions {
  name?: string;
  game_box_id?: string;
  copyPhotos?: boolean;
}

export async function duplicateGameComponent(
  sourceComponentId: string,
  options?: DuplicateGameComponentOptions
) {
  const supabase = await getAdminSupabase();

  if (!sourceComponentId) {
    throw new Error("Source component ID is required");
  }

  // 1. Fetch source component
  const { data: sourceComponent, error: fetchErr } = await supabase
    .from("game_components")
    .select("*")
    .eq("id", sourceComponentId)
    .single();

  if (fetchErr || !sourceComponent) {
    throw new Error("Source game component not found");
  }

  const targetBoxId = options?.game_box_id || sourceComponent.game_box_id;
  const newName = options?.name?.trim() || sourceComponent.name;
  const shouldCopyPhotos = options?.copyPhotos !== false;

  // 2. Determine display order in target box
  let nextOrder = 0;
  try {
    const { data: maxOrderData } = await supabase
      .from("game_components")
      .select("display_order")
      .eq("game_box_id", targetBoxId)
      .order("display_order", { ascending: false })
      .limit(1);

    if (maxOrderData && maxOrderData.length > 0 && maxOrderData[0].display_order != null) {
      nextOrder = maxOrderData[0].display_order + 1;
    } else if (sourceComponent.display_order != null) {
      nextOrder = sourceComponent.display_order + 1;
    }
  } catch {
    // If display_order query fails, fallback to 0
  }

  // 3. Insert duplicate component row
  const now = new Date().toISOString();
  const newCompPayload = {
    game_box_id: targetBoxId,
    name: newName,
    component_type: sourceComponent.component_type || "other",
    quantity_expected: sourceComponent.quantity_expected ?? 0,
    quantity_actual: sourceComponent.quantity_actual ?? 0,
    status: sourceComponent.status || "complete",
    description: sourceComponent.description ?? null,
    notes: sourceComponent.notes ?? null,
    display_order: nextOrder,
    image_storage_path: null as string | null,
    image_updated_at: sourceComponent.image_updated_at,
  };

  const { data: newComponent, error: insertErr } = await supabase
    .from("game_components")
    .insert(newCompPayload)
    .select()
    .single();

  if (insertErr || !newComponent) {
    throw new Error(`Failed to duplicate game component: ${insertErr?.message}`);
  }

  // 4. Duplicate photos if requested
  const copiedPhotos: GameComponentPhoto[] = [];
  if (shouldCopyPhotos) {
    let sourcePhotos: GameComponentPhoto[] = [];
    try {
      const { data: photos, error: photosErr } = await supabase
        .from("game_component_photos")
        .select("*")
        .eq("component_id", sourceComponentId)
        .order("display_order", { ascending: true })
        .order("uploaded_at", { ascending: true });

      if (!photosErr && photos && photos.length > 0) {
        sourcePhotos = photos;
      }
    } catch {
      // Table may not exist or query error
    }

    let primaryCopiedPath: string | null = null;

    if (sourcePhotos.length > 0) {
      for (let i = 0; i < sourcePhotos.length; i++) {
        const photo = sourcePhotos[i];
        if (!photo.storage_path) continue;

        try {
          const cleanPath = photo.storage_path.split("/").pop() || `photo-${i}.jpg`;
          const cleanFilename = cleanPath.replace(/[^a-zA-Z0-9._-]/g, "_");
          const targetKey = `components/${newComponent.id}/${Date.now()}-${i}-${cleanFilename}`;

          await copyR2Object(photo.storage_path, targetKey);

          if (!primaryCopiedPath) {
            primaryCopiedPath = targetKey;
          }

          try {
            const { data: insertedPhoto } = await supabase
              .from("game_component_photos")
              .insert({
                component_id: newComponent.id,
                storage_path: targetKey,
                caption: photo.caption,
                display_order: photo.display_order ?? i,
                uploaded_at: now,
                image_updated_at: now,
              })
              .select()
              .single();

            if (insertedPhoto) {
              copiedPhotos.push(insertedPhoto);
            }
          } catch (err) {
            console.warn("Could not insert duplicated photo row:", err);
          }
        } catch (err) {
          console.warn(`Failed to copy photo ${photo.storage_path} to R2:`, err);
        }
      }
    } else if (sourceComponent.image_storage_path) {
      // Legacy single image
      try {
        const cleanPath = sourceComponent.image_storage_path.split("/").pop() || "image.jpg";
        const cleanFilename = cleanPath.replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetKey = `components/${newComponent.id}/${Date.now()}-${cleanFilename}`;

        await copyR2Object(sourceComponent.image_storage_path, targetKey);
        primaryCopiedPath = targetKey;

        try {
          const { data: insertedPhoto } = await supabase
            .from("game_component_photos")
            .insert({
              component_id: newComponent.id,
              storage_path: targetKey,
              display_order: 0,
              uploaded_at: now,
              image_updated_at: now,
            })
            .select()
            .single();

          if (insertedPhoto) {
            copiedPhotos.push(insertedPhoto);
          }
        } catch {
          // Ignore
        }
      } catch (err) {
        console.warn(
          `Failed to copy component image ${sourceComponent.image_storage_path} to R2:`,
          err
        );
      }
    }

    if (primaryCopiedPath) {
      await supabase
        .from("game_components")
        .update({
          image_storage_path: primaryCopiedPath,
          image_updated_at: now,
          updated_at: now,
        })
        .eq("id", newComponent.id);

      newComponent.image_storage_path = primaryCopiedPath;
      newComponent.image_updated_at = now;
    }
  }

  // 5. Revalidate cache
  revalidatePath("/dashboard/games");
  revalidatePath("/dashboard/games/detail");
  revalidatePath("/dashboard/boxes");
  revalidatePath("/dashboard/admin/game-components");
  revalidatePath("/dashboard/admin/game-boxes");
  revalidatePath("/dashboard/admin");

  return {
    success: true,
    component: {
      ...newComponent,
      photos: copiedPhotos,
      game_component_photos: copiedPhotos,
    },
  };
}
