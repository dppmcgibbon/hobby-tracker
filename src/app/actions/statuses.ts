"use server";

import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeStatusKey } from "@/lib/constants/miniature-status";

async function getAdminSupabase() {
  await requireAuth();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceRoleClient();
  }
  return await createClient();
}

export async function createStatus(data: { name: string; display_order?: number }) {
  const supabase = await getAdminSupabase();

  const key = normalizeStatusKey(data.name);
  if (!key) {
    throw new Error("Status name must contain valid alphanumeric characters");
  }

  // Check if name already exists
  const { data: existing, error: checkErr } = await supabase
    .from("miniature_statuses")
    .select("id, name")
    .eq("name", key)
    .maybeSingle();

  if (checkErr) {
    throw new Error(`Failed to check existing statuses: ${checkErr.message}`);
  }
  if (existing) {
    throw new Error(`A status with identifier "${key}" already exists.`);
  }

  // Fetch current statuses to calculate display order
  const { data: allStatuses, error: listErr } = await supabase
    .from("miniature_statuses")
    .select("id, display_order")
    .order("display_order", { ascending: true });

  if (listErr) {
    throw new Error(`Failed to fetch statuses: ${listErr.message}`);
  }

  let targetOrder = data.display_order;

  if (targetOrder == null || isNaN(targetOrder) || targetOrder < 1) {
    const maxOrder = allStatuses?.reduce((max, s) => Math.max(max, s.display_order), 0) ?? 0;
    targetOrder = maxOrder + 1;
  } else {
    // If inserting at or before existing order, shift subsequent items
    const conflict = allStatuses?.some((s) => s.display_order === targetOrder);
    if (conflict && allStatuses) {
      // Shift items with display_order >= targetOrder up by 1
      // Use negative numbers first to avoid unique constraint collision
      const toShift = allStatuses
        .filter((s) => s.display_order >= targetOrder!)
        .sort((a, b) => b.display_order - a.display_order);

      for (let i = 0; i < toShift.length; i++) {
        await supabase
          .from("miniature_statuses")
          .update({ display_order: -(toShift[i].display_order + 1) })
          .eq("id", toShift[i].id);
      }
      for (let i = 0; i < toShift.length; i++) {
        await supabase
          .from("miniature_statuses")
          .update({ display_order: toShift[i].display_order + 1 })
          .eq("id", toShift[i].id);
      }
    }
  }

  const { data: newStatus, error: insertErr } = await supabase
    .from("miniature_statuses")
    .insert({
      name: key,
      display_order: targetOrder,
    })
    .select()
    .single();

  if (insertErr) {
    throw new Error(`Failed to create status: ${insertErr.message}`);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/statuses");
  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard");

  return { success: true, status: newStatus };
}

export async function updateStatus(
  id: string,
  data: {
    name: string;
    display_order?: number;
  }
) {
  const supabase = await getAdminSupabase();

  const key = normalizeStatusKey(data.name);
  if (!key) {
    throw new Error("Status name must contain valid alphanumeric characters");
  }

  // Get current status
  const { data: current, error: getErr } = await supabase
    .from("miniature_statuses")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !current) {
    throw new Error("Status not found");
  }

  // Check name uniqueness if changed
  if (key !== current.name) {
    const { data: existing } = await supabase
      .from("miniature_statuses")
      .select("id")
      .eq("name", key)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      throw new Error(`A status with identifier "${key}" already exists.`);
    }
  }

  const oldName = current.name;
  const targetOrder = data.display_order ?? current.display_order;

  // Handle display order change if needed
  if (targetOrder !== current.display_order) {
    const { data: allStatuses } = await supabase
      .from("miniature_statuses")
      .select("id, display_order")
      .order("display_order", { ascending: true });

    if (allStatuses) {
      // Reorder items cleanly
      const otherStatuses = allStatuses.filter((s) => s.id !== id);
      const reordered: { id: string; display_order: number }[] = [];

      let inserted = false;
      let pos = 1;
      for (const s of otherStatuses) {
        if (!inserted && pos >= targetOrder) {
          reordered.push({ id, display_order: pos++ });
          inserted = true;
        }
        reordered.push({ id: s.id, display_order: pos++ });
      }
      if (!inserted) {
        reordered.push({ id, display_order: pos });
      }

      // Two-phase update to avoid unique constraint violations
      for (const item of reordered) {
        await supabase
          .from("miniature_statuses")
          .update({ display_order: -item.display_order })
          .eq("id", item.id);
      }
      for (const item of reordered) {
        await supabase
          .from("miniature_statuses")
          .update({
            display_order: item.display_order,
            ...(item.id === id && key !== current.name ? { name: key } : {}),
          })
          .eq("id", item.id);
      }
    }
  } else {
    const { error: updateErr } = await supabase
      .from("miniature_statuses")
      .update({ name: key })
      .eq("id", id);

    if (updateErr) {
      throw new Error(`Failed to update status: ${updateErr.message}`);
    }
  }

  // If status name changed, cascade update to miniature_status table
  if (key !== oldName) {
    const { error: cascadeErr } = await supabase
      .from("miniature_status")
      .update({ status: key, status_id: id })
      .or(`status_id.eq.${id},status.eq.${oldName}`);

    if (cascadeErr) {
      console.warn("Failed to cascade status update to miniature_status:", cascadeErr);
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/statuses");
  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteStatus(
  id: string,
  options?: {
    reassignToStatusName?: string;
  }
) {
  const supabase = await getAdminSupabase();

  // Get current status
  const { data: statusToDelete, error: getErr } = await supabase
    .from("miniature_statuses")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !statusToDelete) {
    throw new Error("Status not found");
  }

  // Check how many miniatures use this status
  const { count, error: countErr } = await supabase
    .from("miniature_status")
    .select("id", { count: "exact", head: true })
    .or(`status_id.eq.${id},status.eq.${statusToDelete.name}`);

  if (countErr) {
    throw new Error(`Failed to check miniature usage: ${countErr.message}`);
  }

  const inUseCount = count ?? 0;

  if (inUseCount > 0) {
    if (!options?.reassignToStatusName) {
      throw new Error(
        `Cannot delete status "${statusToDelete.name}" because it is currently assigned to ${inUseCount} miniature(s). Please choose a replacement status to reassign them.`
      );
    }

    // Verify replacement status
    const { data: replacement, error: replErr } = await supabase
      .from("miniature_statuses")
      .select("id, name")
      .eq("name", options.reassignToStatusName)
      .neq("id", id)
      .maybeSingle();

    if (replErr || !replacement) {
      throw new Error("Replacement status not found");
    }

    // Migrate miniatures to replacement status
    const { error: reassignErr } = await supabase
      .from("miniature_status")
      .update({
        status: replacement.name,
        status_id: replacement.id,
      })
      .or(`status_id.eq.${id},status.eq.${statusToDelete.name}`);

    if (reassignErr) {
      throw new Error(`Failed to reassign miniatures to new status: ${reassignErr.message}`);
    }
  }

  // Delete status
  const { error: deleteErr } = await supabase.from("miniature_statuses").delete().eq("id", id);

  if (deleteErr) {
    throw new Error(`Failed to delete status: ${deleteErr.message}`);
  }

  // Compact remaining statuses display_order (1..N)
  const { data: remaining } = await supabase
    .from("miniature_statuses")
    .select("id, display_order")
    .order("display_order", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("miniature_statuses")
        .update({ display_order: -(i + 1) })
        .eq("id", remaining[i].id);
    }
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("miniature_statuses")
        .update({ display_order: i + 1 })
        .eq("id", remaining[i].id);
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/statuses");
  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function moveStatus(id: string, direction: "up" | "down") {
  const supabase = await getAdminSupabase();

  const { data: allStatuses, error } = await supabase
    .from("miniature_statuses")
    .select("id, display_order")
    .order("display_order", { ascending: true });

  if (error || !allStatuses) {
    throw new Error("Failed to load statuses");
  }

  const currentIndex = allStatuses.findIndex((s) => s.id === id);
  if (currentIndex === -1) {
    throw new Error("Status not found");
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allStatuses.length) {
    return { success: true }; // Already at edge
  }

  const currentItem = allStatuses[currentIndex];
  const targetItem = allStatuses[targetIndex];

  // Two-phase swap to prevent unique constraint conflict
  await supabase
    .from("miniature_statuses")
    .update({ display_order: -currentItem.display_order })
    .eq("id", currentItem.id);

  await supabase
    .from("miniature_statuses")
    .update({ display_order: currentItem.display_order })
    .eq("id", targetItem.id);

  await supabase
    .from("miniature_statuses")
    .update({ display_order: targetItem.display_order })
    .eq("id", currentItem.id);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/statuses");
  revalidatePath("/dashboard/miniatures");
  revalidatePath("/dashboard");

  return { success: true };
}
