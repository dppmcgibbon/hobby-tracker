import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { StorageClient } from "@/components/storage/storage-client";

export default async function StoragePage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch storage boxes for the user
  const { data: storageBoxes } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  // Fetch miniature counts (sum of quantities) for each storage box
  const storageBoxIds = (storageBoxes || []).map(box => box.id);
  
  let miniatureCounts: Record<string, number> = {};
  if (storageBoxIds.length > 0) {
    const { data: miniatures } = await supabase
      .from("miniatures")
      .select("storage_box_id, quantity")
      .in("storage_box_id", storageBoxIds);
    
    // Sum quantities for each storage box
    miniatureCounts = (miniatures || []).reduce((acc, mini) => {
      const boxId = mini.storage_box_id;
      if (boxId) {
        acc[boxId] = (acc[boxId] || 0) + (mini.quantity || 0);
      }
      return acc;
    }, {} as Record<string, number>);
  }

  // Add miniature counts to storage boxes
  const storageBoxesWithCount = (storageBoxes || []).map((box) => ({
    ...box,
    miniature_count: miniatureCounts[box.id] || 0,
  }));

  return <StorageClient storageBoxes={storageBoxesWithCount} />;
}
