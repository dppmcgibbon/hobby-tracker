"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import {
  gameSchema,
  editionSchema,
  expansionSchema,
  miniatureGameSchema,
  type GameInput,
  type EditionInput,
  type ExpansionInput,
  type MiniatureGameInput,
} from "@/lib/validations/game";

// ==================== GAMES ====================

export async function createGame(data: GameInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = gameSchema.parse(data);

  const { data: game, error } = await supabase.from("games").insert(validated).select().single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true, game };
}

export async function updateGame(id: string, data: GameInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = gameSchema.parse(data);

  const { data: game, error } = await supabase
    .from("games")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${id}`);
  return { success: true, game };
}

export async function deleteGame(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("games").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== EDITIONS ====================

export async function createEdition(data: EditionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = editionSchema.parse(data);

  const { data: edition, error } = await supabase
    .from("editions")
    .insert(validated)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  return { success: true, edition };
}

export async function updateEdition(id: string, data: EditionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = editionSchema.parse(data);

  const { data: edition, error } = await supabase
    .from("editions")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  revalidatePath(`/dashboard/games/${validated.game_id}`);
  return { success: true, edition };
}

export async function deleteEdition(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("editions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== EXPANSIONS ====================

export async function createExpansion(data: ExpansionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = expansionSchema.parse(data);

  const { data: expansion, error } = await supabase
    .from("expansions")
    .insert(validated)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true, expansion };
}

export async function updateExpansion(id: string, data: ExpansionInput) {
  await requireAuth();
  const supabase = await createClient();

  const validated = expansionSchema.parse(data);

  const { data: expansion, error } = await supabase
    .from("expansions")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true, expansion };
}

export async function deleteExpansion(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("expansions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/games");
  return { success: true };
}

// ==================== MINIATURE-GAME LINKS ====================

export async function linkMiniatureToGame(data: MiniatureGameInput) {
  const user = await requireAuth();
  const supabase = await createClient();

  const validated = miniatureGameSchema.parse(data);

  // Verify user owns the miniature
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", validated.miniature_id)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  // Use upsert to insert or update if the link already exists
  const { error } = await supabase.from("miniature_games").upsert(validated, {
    onConflict: "miniature_id,game_id",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${validated.miniature_id}`);
  return { success: true };
}

export async function unlinkMiniatureFromGame(miniatureId: string, gameId: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify user owns the miniature
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  const { error } = await supabase
    .from("miniature_games")
    .delete()
    .eq("miniature_id", miniatureId)
    .eq("game_id", gameId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${miniatureId}`);
  return { success: true };
}

export async function updateMiniatureGame(
  miniatureId: string,
  gameId: string,
  data: Partial<MiniatureGameInput>
) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Verify user owns the miniature
  const { data: miniature } = await supabase
    .from("miniatures")
    .select("id")
    .eq("id", miniatureId)
    .eq("user_id", user.id)
    .single();

  if (!miniature) {
    throw new Error("Miniature not found");
  }

  const { error } = await supabase
    .from("miniature_games")
    .update(data)
    .eq("miniature_id", miniatureId)
    .eq("game_id", gameId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/collection/${miniatureId}`);
  return { success: true };
}
