import { createClient } from "@/lib/supabase/server";
import { STATUS_GROUP_IN_PROGRESS, STATUS_GROUP_BACKLOG } from "@/lib/constants/miniature-status";

const PAGE_SIZE = 1000;

/** Fetch all miniatures for a user with pagination (matches miniatures page behaviour). */
async function fetchAllMiniaturesForStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const select =
    "id, quantity, created_at, faction_id, factions(name), miniature_status(status, completed_at)";
  let all: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("miniatures")
      .select(select)
      .eq("user_id", userId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all = all.concat(data);
    hasMore = data.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return all;
}

/** Same as miniatures page: sum uses quantity, treating null/undefined as 0. */
function qty(m: { quantity?: number | null }): number {
  const q = m.quantity;
  return typeof q === "number" && q >= 0 ? q : 0;
}

export async function getCollectionStatistics(userId: string) {
  const supabase = await createClient();

  const miniatures = await fetchAllMiniaturesForStats(supabase, userId);
  if (miniatures.length === 0) return null;

  // Calculate totals (use qty() so null/undefined quantity is treated as 1, matching miniatures page)
  const totalMiniatures = miniatures.reduce((sum, m) => sum + qty(m), 0);
  const uniqueModels = miniatures.length;

  // Status breakdown
  const statusBreakdown = miniatures.reduce(
    (acc, m) => {
      const status = m.miniature_status?.status || "backlog";
      acc[status] = (acc[status] || 0) + qty(m);
      return acc;
    },
    {} as Record<string, number>
  );

  const completed = statusBreakdown.complete || 0;
  // In Progress: Built, Primed, Painting Started, Sub Assembled
  const painting =
    (statusBreakdown.built || 0) +
    (statusBreakdown.primed || 0) +
    (statusBreakdown.painting_started || 0) +
    (statusBreakdown.sub_assembled || 0);
  const primed = statusBreakdown.primed || 0;
  const assembled = statusBreakdown.built || 0;
  const backlog =
    (statusBreakdown.backlog || 0) +
    (statusBreakdown.unknown || 0) +
    (statusBreakdown.missing || 0) +
    (statusBreakdown.needs_stripped || 0) +
    (statusBreakdown.needs_repair || 0) +
    (statusBreakdown.missing_arm || 0) +
    (statusBreakdown.missing_leg || 0) +
    (statusBreakdown.missing_head || 0);

  const completionPercentage = totalMiniatures > 0 ? (completed / totalMiniatures) * 100 : 0;

  // Faction breakdown
  const factionBreakdown = miniatures.reduce(
    (acc, m) => {
      const factionName = m.factions?.name || "Unknown";
      acc[factionName] = (acc[factionName] || 0) + qty(m);
      return acc;
    },
    {} as Record<string, number>
  );

  // Monthly completion data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const completionsByMonth = miniatures
    .filter(
      (m) =>
        m.miniature_status?.completed_at &&
        new Date(m.miniature_status.completed_at) >= sixMonthsAgo
    )
    .reduce(
      (acc, m) => {
        const date = new Date(m.miniature_status.completed_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        acc[monthKey] = (acc[monthKey] || 0) + qty(m);
        return acc;
      },
      {} as Record<string, number>
    );

  // Growth over time (miniatures added per month)
  const additionsByMonth = miniatures.reduce(
    (acc, m) => {
      const date = new Date(m.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[monthKey] = (acc[monthKey] || 0) + qty(m);
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalMiniatures,
    uniqueModels,
    completed,
    painting,
    primed,
    assembled,
    backlog,
    completionPercentage,
    factionBreakdown,
    statusBreakdown,
    completionsByMonth,
    additionsByMonth,
  };
}

export type FactionBreakdownFilter = "all" | "complete" | "in_progress" | "backlog";

/** Faction breakdown for a subset of miniatures by status filter (for army distribution page). */
export async function getFactionBreakdown(
  userId: string,
  filter: FactionBreakdownFilter = "all"
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const miniatures = await fetchAllMiniaturesForStats(supabase, userId);
  const filtered =
    filter === "all"
      ? miniatures
      : miniatures.filter((m) => {
          const status = m.miniature_status?.status || "backlog";
          if (filter === "complete") return status === "complete";
          if (filter === "in_progress") return STATUS_GROUP_IN_PROGRESS.has(status as any);
          if (filter === "backlog") return STATUS_GROUP_BACKLOG.has(status as any);
          return true;
        });
  return filtered.reduce(
    (acc, m) => {
      const factionName = m.factions?.name || "Unknown";
      acc[factionName] = (acc[factionName] || 0) + qty(m);
      return acc;
    },
    {} as Record<string, number>
  );
}

export type FactionBreakdownEntry = {
  factionId: string | null;
  factionName: string;
  count: number;
};

/** Like getFactionBreakdown but returns array with faction ids for building miniatures links. */
export async function getFactionBreakdownWithIds(
  userId: string,
  filter: FactionBreakdownFilter = "all"
): Promise<FactionBreakdownEntry[]> {
  const supabase = await createClient();
  const miniatures = await fetchAllMiniaturesForStats(supabase, userId);
  const filtered =
    filter === "all"
      ? miniatures
      : miniatures.filter((m) => {
          const status = m.miniature_status?.status || "backlog";
          if (filter === "complete") return status === "complete";
          if (filter === "in_progress") return STATUS_GROUP_IN_PROGRESS.has(status as any);
          if (filter === "backlog") return STATUS_GROUP_BACKLOG.has(status as any);
          return true;
        });
  const byKey = new Map<string, { factionId: string | null; factionName: string; count: number }>();
  for (const m of filtered) {
    const factionId = m.faction_id ?? null;
    const factionName = m.factions?.name ?? "Unknown";
    const key = factionId ?? "null";
    const existing = byKey.get(key);
    const add = qty(m);
    if (existing) {
      existing.count += add;
    } else {
      byKey.set(key, { factionId, factionName, count: add });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
}

export async function getRecentActivity(userId: string) {
  const supabase = await createClient();

  // Recent miniatures added
  const { data: recentMiniatures } = await supabase
    .from("miniatures")
    .select("id, name, created_at, factions(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent status changes (via updated_at)
  const { data: recentCompletions } = await supabase
    .from("miniature_status")
    .select(
      `
      id,
      status,
      completed_at,
      miniature_id,
      miniatures(name)
    `
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  // Recent photos uploaded
  const { data: recentPhotos } = await supabase
    .from("miniature_photos")
    .select(
      `
      id,
      storage_path,
      uploaded_at,
      miniatures(id, name)
    `
    )
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
    .limit(5);

  return {
    recentMiniatures: recentMiniatures || [],
    recentCompletions: recentCompletions || [],
    recentPhotos: recentPhotos || [],
  };
}

export async function getPaintStatistics(userId: string) {
  const supabase = await createClient();

  // User paint inventory count
  const { count: paintCount } = await supabase
    .from("user_paints")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Most used paints (from recipe steps)
  const { data: recipePaints } = await supabase
    .from("recipe_steps")
    .select(
      `
      paint_id,
      paints(name, brand, type, color_hex),
      painting_recipes!inner(user_id)
    `
    )
    .eq("painting_recipes.user_id", userId);

  interface PaintUsage {
    name: string;
    brand: string;
    type: string;
    color_hex?: string;
    count: number;
  }

  const paintUsage = recipePaints?.reduce(
    (acc, step) => {
      if (step.paint_id && step.paints) {
        const paintInfo = step.paints;
        const key = step.paint_id;
        if (!acc[key]) {
          acc[key] = { ...paintInfo, count: 0 };
        }
        acc[key].count++;
      }
      return acc;
    },
    {} as Record<string, PaintUsage>
  );

  const mostUsedPaints = paintUsage
    ? Object.values(paintUsage)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  return {
    paintCount: paintCount || 0,
    mostUsedPaints,
  };
}

export async function getGameStatistics(userId: string) {
  const supabase = await createClient();

  // Get all miniature-game links with game details
  const { data: miniatureGames } = await supabase
    .from("miniature_games")
    .select(
      `
      miniature_id,
      game_id,
      edition_id,
      expansion_id,
      games(id, name, publisher),
      editions(id, name, year),
      expansions(id, name, year)
    `
    );

  // Get all user's miniatures to count quantities
  const { data: miniatures } = await supabase
    .from("miniatures")
    .select("id, quantity")
    .eq("user_id", userId);

  if (!miniatureGames || !miniatures) {
    return {
      gameBreakdown: [],
      totalGames: 0,
      totalLinkedMiniatures: 0,
    };
  }

  // Create a map of miniature IDs to quantities
  const miniatureQuantities = new Map(miniatures.map((m) => [m.id, m.quantity]));

  // Count miniatures per game
  const gameCount: Record<string, { name: string; count: number; editions: Set<string> }> = {};

  miniatureGames.forEach((mg) => {
    const game = Array.isArray(mg.games) ? mg.games[0] : mg.games;
    if (game) {
      const quantity = miniatureQuantities.get(mg.miniature_id) || 1;
      
      if (!gameCount[game.id]) {
        gameCount[game.id] = {
          name: game.name,
          count: 0,
          editions: new Set(),
        };
      }
      
      gameCount[game.id].count += quantity;
      
      // Track editions
      if (mg.edition_id) {
        gameCount[game.id].editions.add(mg.edition_id);
      }
    }
  });

  const gameBreakdown = Object.entries(gameCount)
    .map(([id, data]) => ({
      id,
      name: data.name,
      count: data.count,
      editionCount: data.editions.size,
    }))
    .sort((a, b) => b.count - a.count);

  const totalLinkedMiniatures = gameBreakdown.reduce((sum, g) => sum + g.count, 0);

  return {
    gameBreakdown,
    totalGames: gameBreakdown.length,
    totalLinkedMiniatures,
  };
}
