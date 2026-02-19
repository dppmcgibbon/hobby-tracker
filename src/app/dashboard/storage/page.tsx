import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { StorageClient } from "@/components/storage/storage-client";

// Force dynamic rendering so totals update on each request
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoragePage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch storage boxes for the user
  const { data: storageBoxes } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  // Fetch miniature counts via RPC (avoids 1000-row limit, aggregates in DB)
  const storageBoxIds = (storageBoxes || []).map((box) => box.id);

  let miniatureCounts: Record<string, number> = {};
  if (storageBoxIds.length > 0) {
    const { data: counts } = await supabase.rpc("get_storage_box_miniature_counts", {
      p_box_ids: storageBoxIds,
      p_user_id: user.id,
    });

    miniatureCounts = (counts || []).reduce(
      (acc: Record<string, number>, row: { storage_box_id: string; total_quantity: number }) => {
        if (row.storage_box_id) {
          acc[row.storage_box_id] = Number(row.total_quantity);
        }
        return acc;
      },
      {}
    );
  }

  // Add miniature counts to storage boxes
  const storageBoxesWithCount = (storageBoxes || []).map((box) => ({
    ...box,
    miniature_count: miniatureCounts[box.id] || 0,
  }));

  return <StorageClient storageBoxes={storageBoxesWithCount} />;
}
