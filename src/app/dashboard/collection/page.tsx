import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { CollectionClient } from "./collection-client";

// Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const params = await searchParams;

  // Fetch factions, tags, collections, games, storage boxes, and recipes for filter dropdown
  const [
    { data: factions },
    { data: tags },
    { data: collections },
    { data: games },
    { data: storageBoxes },
    { data: recipesData },
  ] = await Promise.all([
    supabase.from("factions").select("id, name").order("name"),
    supabase.from("tags").select("id, name, color").eq("user_id", user.id).order("name"),
    supabase.from("collections").select("id, name").eq("user_id", user.id).order("name"),
    supabase.from("games").select("id, name").order("name"),
    supabase.from("storage_boxes").select("id, name, location").eq("user_id", user.id).order("name"),
    supabase
      .from("painting_recipes")
      .select("id, name, faction:factions(name)")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  // Normalize recipes data
  const recipes = (recipesData || []).map((r) => ({
    id: r.id,
    name: r.name,
    faction: Array.isArray(r.faction) ? r.faction[0] : r.faction,
  }));

  // Build query with filters
  let query = supabase
    .from("miniatures")
    .select(
      `
      id,
      name,
      quantity,
      created_at,
      storage_box_id,
      factions (id, name),
      miniature_status (status, completed_at, magnetised, based),
      miniature_photos (id, storage_path)
    `
    )
    .eq("user_id", user.id);

  // Apply search filter
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Apply faction filter
  if (params.faction && params.faction !== "all") {
    query = query.eq("faction_id", params.faction);
  }

  // Apply status filter
  if (params.status && params.status !== "all") {
    // Note: This requires a join or separate query for status
    // For now, we'll filter client-side or adjust the query structure
  }

  // Apply tag filter (we'll do this client-side after fetching miniature_tags)
  let tagFilteredMiniatureIds: Set<string> | null = null;
  if (params.tag && params.tag !== "all") {
    const { data: taggedMiniatures } = await supabase
      .from("miniature_tags")
      .select("miniature_id")
      .eq("tag_id", params.tag);

    if (taggedMiniatures) {
      tagFilteredMiniatureIds = new Set(taggedMiniatures.map((t) => t.miniature_id));
    }
  }

  // Apply storage filter
  if (params.storage && params.storage !== "all") {
    if (params.storage === "none") {
      query = query.is("storage_box_id", null);
    } else {
      query = query.eq("storage_box_id", params.storage);
    }
  }

  // Apply game filter (we'll do this client-side after fetching miniature_games)
  let gameFilteredMiniatureIds: Set<string> | null = null;
  if (params.game && params.game !== "all") {
    let gameQuery = supabase
      .from("miniature_games")
      .select("miniature_id")
      .eq("game_id", params.game);

    // Add edition filter if specified
    if (params.edition && params.edition !== "all") {
      gameQuery = gameQuery.eq("edition_id", params.edition);
    }

    // Add expansion filter if specified
    if (params.expansion && params.expansion !== "all") {
      gameQuery = gameQuery.eq("expansion_id", params.expansion);
    }

    const { data: gameMiniatures } = await gameQuery;

    if (gameMiniatures) {
      gameFilteredMiniatureIds = new Set(gameMiniatures.map((g) => g.miniature_id));
    }
  }

  // Fetch editions if game filter is active
  let editions: { id: string; name: string; year: number | null }[] = [];
  if (params.game && params.game !== "all") {
    const { data: editionsData } = await supabase
      .from("editions")
      .select("id, name, year")
      .eq("game_id", params.game)
      .order("sequence");
    editions = editionsData || [];
  }

  // Fetch expansions if edition filter is active
  let expansions: { id: string; name: string; year: number | null }[] = [];
  if (params.edition && params.edition !== "all") {
    const { data: expansionsData } = await supabase
      .from("expansions")
      .select("id, name, year")
      .eq("edition_id", params.edition)
      .order("sequence");
    expansions = expansionsData || [];
  }

  // Apply sorting
  const sortBy = params.sortBy || "created_at";
  const sortOrder = (params.sortOrder || "desc") as "asc" | "desc";

  if (sortBy === "name") {
    query = query.order("name", { ascending: sortOrder === "asc" });
  } else if (sortBy === "created_at") {
    query = query.order("created_at", { ascending: sortOrder === "asc" });
  } else if (sortBy === "quantity") {
    query = query.order("quantity", { ascending: sortOrder === "asc" });
  }

  const { data: miniatures, error } = await query;

  if (error) {
    console.error("Error fetching miniatures:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to fetch miniatures: ${error.message}`);
  }

  // Log first miniature to see the structure
  if (miniatures && miniatures.length > 0) {
    console.log("First miniature photos:", miniatures[0].miniature_photos);
    
    // Fetch storage boxes for miniatures that have them
    const miniatureIdsWithStorage = miniatures
      .filter((m) => m.storage_box_id)
      .map((m) => m.storage_box_id);
    
    if (miniatureIdsWithStorage.length > 0) {
      const { data: storageBoxData } = await supabase
        .from("storage_boxes")
        .select("id, name, location")
        .in("id", miniatureIdsWithStorage);
      
      // Create a map of storage boxes by ID
      const storageBoxMap = new Map(
        (storageBoxData || []).map((box) => [box.id, box])
      );
      
      // Attach storage boxes to miniatures
      miniatures.forEach((m) => {
        if (m.storage_box_id && storageBoxMap.has(m.storage_box_id)) {
          (m as any).storage_boxes = storageBoxMap.get(m.storage_box_id);
        }
      });
    }
  }

  // Client-side status filtering if needed
  let filteredMiniatures = (miniatures || []).map((m) => ({
    ...m,
    factions: Array.isArray(m.factions) ? m.factions[0] : m.factions,
    miniature_status: Array.isArray(m.miniature_status)
      ? m.miniature_status[0]
      : m.miniature_status,
    miniature_photos: Array.isArray(m.miniature_photos) ? m.miniature_photos : [],
    storage_box: Array.isArray(m.storage_boxes) ? m.storage_boxes[0] : m.storage_boxes,
  }));

  // Apply tag filter
  if (tagFilteredMiniatureIds) {
    filteredMiniatures = filteredMiniatures.filter((m) => tagFilteredMiniatureIds.has(m.id));
  }

  // Apply game filter
  if (gameFilteredMiniatureIds) {
    filteredMiniatures = filteredMiniatures.filter((m) => gameFilteredMiniatureIds.has(m.id));
  }

  // Apply status filter
  if (params.status && params.status !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const status = m.miniature_status?.status || "backlog";
      return status === params.status;
    });
  }

  return (
    <CollectionClient
      miniatures={filteredMiniatures}
      factions={factions || []}
      tags={tags || []}
      collections={collections || []}
      storageBoxes={storageBoxes || []}
      recipes={recipes || []}
      games={games || []}
      editions={editions}
      expansions={expansions}
      initialFilters={{
        search: params.search || "",
        factionId: params.faction || "all",
        status: params.status || "all",
        tagId: params.tag || "all",
        storageBoxId: params.storage || "all",
        gameId: params.game || "all",
        editionId: params.edition || "all",
        expansionId: params.expansion || "all",
        sortBy: params.sortBy || "created_at",
        sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
      }}
    />
  );
}
