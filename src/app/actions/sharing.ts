"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

export async function createShare(miniatureId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify ownership
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  // Generate share token
  const { data: tokenData } = await supabase.rpc("generate_share_token");
  const shareToken = tokenData;

  const { data: share, error } = await supabase
    .from("shared_miniatures")
    .insert({
      miniature_id: miniatureId,
      user_id: user.id,
      share_token: shareToken,
      is_public: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true, share };
}

export async function deleteShare(miniatureId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("shared_miniatures")
    .delete()
    .eq("miniature_id", miniatureId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/miniatures/${miniatureId}`);
  return { success: true };
}

export async function incrementShareView(shareToken: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("increment", {
    table_name: "shared_miniatures",
    row_id: shareToken,
    column_name: "view_count",
  });

  // Silently fail - don't break if this doesn't work
  return { success: !error };
}
