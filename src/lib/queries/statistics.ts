import { createClient } from "@/lib/supabase/server";

export async function getCollectionStatistics(userId: string) {
  const supabase = await createClient();

  // Get all miniatures with status
  const { data: miniatures } = await supabase
    .from("miniatures")
    .select(
      `
      id,
      quantity,
      created_at,
      faction_id,
      factions(name),
      miniature_status(status, completed_at)
    `
    )
    .eq("user_id", userId);

  if (!miniatures) return null;

  // Calculate totals
  const totalMiniatures = miniatures.reduce((sum, m) => sum + m.quantity, 0);
  const uniqueModels = miniatures.length;

  // Status breakdown
  const statusBreakdown = miniatures.reduce(
    (acc, m) => {
      const status = m.miniature_status?.status || "backlog";
      acc[status] = (acc[status] || 0) + m.quantity;
      return acc;
    },
    {} as Record<string, number>
  );

  const completed = statusBreakdown.completed || 0;
  const painting = statusBreakdown.painting || 0;
  const primed = statusBreakdown.primed || 0;
  const assembled = statusBreakdown.assembled || 0;
  const backlog = statusBreakdown.backlog || 0;

  const completionPercentage = totalMiniatures > 0 ? (completed / totalMiniatures) * 100 : 0;

  // Faction breakdown
  const factionBreakdown = miniatures.reduce(
    (acc, m) => {
      const factionName = m.factions?.name || "Unknown";
      acc[factionName] = (acc[factionName] || 0) + m.quantity;
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
        acc[monthKey] = (acc[monthKey] || 0) + m.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

  // Growth over time (miniatures added per month)
  const additionsByMonth = miniatures.reduce(
    (acc, m) => {
      const date = new Date(m.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[monthKey] = (acc[monthKey] || 0) + m.quantity;
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
      paints(name, brand, type),
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
