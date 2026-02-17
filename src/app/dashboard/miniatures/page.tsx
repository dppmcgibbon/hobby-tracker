import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { CollectionClient } from "./miniatures-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MiniaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const params = await searchParams;

  // Fetch filter options (no user_id filtering needed for global tables)
  const [
    { data: factions },
    { data: tags },
    { data: collections },
    { data: universes },
    { data: allGames },
    { data: storageBoxes },
    { data: recipesData },
    { data: unitTypesData },
    { data: basesData },
    { data: baseShapesData },
    { data: baseTypesData },
  ] = await Promise.all([
    supabase.from("factions").select("id, name").order("name"),
    supabase.from("tags").select("id, name, color").eq("user_id", user.id).order("name"),
    supabase.from("collections").select("id, name").eq("user_id", user.id).order("name"),
    supabase.from("universes").select("id, name").order("name"),
    supabase.from("games").select("id, name, universe_id").order("name"),
    supabase.from("storage_boxes").select("id, name, location").eq("user_id", user.id).order("name"),
    supabase
      .from("painting_recipes")
      .select("id, name, faction:factions(name)")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("miniatures")
      .select("unit_type")
      .eq("user_id", user.id)
      .not("unit_type", "is", null),
    supabase.from("bases").select("id, name").order("name"),
    supabase.from("base_shapes").select("id, name").order("name"),
    supabase.from("base_types").select("id, name").order("name"),
  ]);

  // Process recipes and unit types
  const recipes = (recipesData || []).map((r) => ({
    id: r.id,
    name: r.name,
    faction: Array.isArray(r.faction) ? r.faction[0] : r.faction,
  }));

  const unitTypes = Array.from(
    new Set(
      (unitTypesData || [])
        .map((m) => m.unit_type)
        .filter((ut): ut is string => ut !== null && ut !== "")
    )
  ).sort();

  // Fetch editions and expansions if game/edition filters are active
  let editions: { id: string; name: string; year: number | null }[] = [];
  let expansions: { id: string; name: string; year: number | null }[] = [];

  if (params.game && params.game !== "all" && params.game !== "none") {
    const { data: editionsData } = await supabase
      .from("editions")
      .select("id, name, year")
      .eq("game_id", params.game)
      .order("sequence");
    editions = editionsData || [];
  }

  if (params.edition && params.edition !== "all") {
    const { data: expansionsData } = await supabase
      .from("expansions")
      .select("id, name, year")
      .eq("edition_id", params.edition)
      .order("sequence");
    expansions = expansionsData || [];
  }

  // Build base query
  let query = supabase
    .from("miniatures")
    .select(
      `
      id,
      name,
      quantity,
      created_at,
      storage_box_id,
      unit_type,
      base_id,
      base_shape_id,
      base_type_id,
      notes,
      material,
      year,
      factions (id, name),
      miniature_status (status, completed_at, magnetised, based),
      miniature_photos (id, storage_path),
      bases (id, name),
      base_shapes (id, name),
      base_types (id, name),
      miniature_tags (
        tag_id,
        tags (id, name, color)
      ),
      miniature_games (
        game_id,
        edition_id,
        expansion_id,
        game:games (id, name),
        edition:editions (id, name),
        expansion:expansions (id, name)
      )
    `
    )
    .eq("user_id", user.id);

  // Apply server-side filters
  if (params.search) query = query.ilike("name", `%${params.search}%`);
  if (params.unit) query = query.eq("unit_type", params.unit);
  if (params.faction && params.faction !== "all") query = query.eq("faction_id", params.faction);
  if (params.base_size && params.base_size !== "all") {
    if (params.base_size === "none") {
      query = query.is("base_id", null);
    } else {
      query = query.eq("base_id", params.base_size);
    }
  }
  if (params.storage && params.storage !== "all") {
    if (params.storage === "none") {
      query = query.is("storage_box_id", null);
    } else {
      query = query.eq("storage_box_id", params.storage);
    }
  }

  query = query.order("created_at", { ascending: false });

  // Fetch ALL miniatures using pagination (handle collections >1000 items)
  const allMiniatures = await fetchAllMiniatures(query);

  // Fetch storage boxes for miniatures that have them
  const miniatureIdsWithStorage = allMiniatures
    .filter((m) => m.storage_box_id)
    .map((m) => m.storage_box_id);

  if (miniatureIdsWithStorage.length > 0) {
    const { data: storageBoxData } = await supabase
      .from("storage_boxes")
      .select("id, name, location")
      .in("id", miniatureIdsWithStorage);

    const storageBoxMap = new Map(
      (storageBoxData || []).map((box) => [box.id, box])
    );

    allMiniatures.forEach((m) => {
      if (m.storage_box_id && storageBoxMap.has(m.storage_box_id)) {
        (m as any).storage_boxes = storageBoxMap.get(m.storage_box_id);
      }
    });
  }

  // Apply client-side filters
  let filteredMiniatures = allMiniatures.map((m) => ({
    ...m,
    factions: Array.isArray(m.factions) ? m.factions[0] : m.factions,
    miniature_status: Array.isArray(m.miniature_status) ? m.miniature_status[0] : m.miniature_status,
    miniature_photos: m.miniature_photos || [],
    storage_box: Array.isArray(m.storage_boxes) ? m.storage_boxes[0] : m.storage_boxes,
    bases: Array.isArray(m.bases) ? m.bases[0] : m.bases,
    base_shapes: Array.isArray(m.base_shapes) ? m.base_shapes[0] : m.base_shapes,
    base_types: Array.isArray(m.base_types) ? m.base_types[0] : m.base_types,
  }));

  // Tag filter
  if (params.tag && params.tag !== "all") {
    const { data: taggedMiniatures } = await supabase
      .from("miniature_tags")
      .select("miniature_id")
      .eq("tag_id", params.tag);
    const taggedIds = new Set((taggedMiniatures || []).map((t) => t.miniature_id));
    filteredMiniatures = filteredMiniatures.filter((m) => taggedIds.has(m.id));
  }

  // Universe filter
  if (params.universe && params.universe !== "all") {
    const { data: universeGames } = await supabase
      .from("games")
      .select("id")
      .eq("universe_id", params.universe);
    
    if (universeGames && universeGames.length > 0) {
      const gameIds = universeGames.map((g) => g.id);
      const { data: universeMiniatures } = await supabase
        .from("miniature_games")
        .select("miniature_id")
        .in("game_id", gameIds);
      const universeIds = new Set((universeMiniatures || []).map((m) => m.miniature_id));
      filteredMiniatures = filteredMiniatures.filter((m) => universeIds.has(m.id));
    } else {
      filteredMiniatures = [];
    }
  }

  // Game filter
  if (params.game && params.game !== "all") {
    if (params.game === "none") {
      filteredMiniatures = filteredMiniatures.filter((m) => !m.miniature_games || m.miniature_games.length === 0);
    } else {
      let gameQuery = supabase
        .from("miniature_games")
        .select("miniature_id")
        .eq("game_id", params.game);
      
      if (params.edition && params.edition !== "all") {
        gameQuery = gameQuery.eq("edition_id", params.edition);
      }
      if (params.expansion && params.expansion !== "all") {
        gameQuery = gameQuery.eq("expansion_id", params.expansion);
      }

      const { data: gameMiniatures } = await gameQuery;
      const gameIds = new Set((gameMiniatures || []).map((g) => g.miniature_id));
      filteredMiniatures = filteredMiniatures.filter((m) => gameIds.has(m.id));
    }
  }

  // Status filter
  if (params.status && params.status !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const status = m.miniature_status?.status || "backlog";
      return status === params.status;
    });
  }

  // Photo filter
  if (params.photos && params.photos !== "all") {
    if (params.photos === "no") {
      filteredMiniatures = filteredMiniatures.filter((m) => !m.miniature_photos || m.miniature_photos.length === 0);
    } else if (params.photos === "yes") {
      filteredMiniatures = filteredMiniatures.filter((m) => m.miniature_photos && m.miniature_photos.length > 0);
    }
  }

  // Magnetised filter
  if (params.magnetised && params.magnetised !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const isMagnetised = m.miniature_status?.magnetised === true;
      return params.magnetised === "yes" ? isMagnetised : !isMagnetised;
    });
  }

  // Based filter
  if (params.based && params.based !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const isBased = m.miniature_status?.based === true;
      return params.based === "yes" ? isBased : !isBased;
    });
  }

  return (
    <CollectionClient
      miniatures={filteredMiniatures}
      factions={factions || []}
      tags={tags || []}
      collections={collections || []}
      universes={universes || []}
      storageBoxes={storageBoxes || []}
      recipes={recipes || []}
      games={(allGames || []).map((game: any) => ({
        id: game.id,
        name: game.name,
        universe_id: game.universe_id,
      }))}
      editions={editions}
      expansions={expansions}
      unitTypes={unitTypes}
      bases={basesData || []}
      baseShapes={baseShapesData || []}
      baseTypes={baseTypesData || []}
      initialFilters={{
        search: params.search || "",
        factionId: params.faction || "all",
        status: params.status || "all",
        tagId: params.tag || "all",
        storageBoxId: params.storage || "all",
        universeId: params.universe || "all",
        gameId: params.game || "all",
        editionId: params.edition || "all",
        expansionId: params.expansion || "all",
        unitType: params.unit || "all",
        baseSize: params.base_size || "all",
        hasPhotos: params.photos || "all",
        magnetised: params.magnetised || "all",
        based: params.based || "all",
      }}
    />
  );
}

// Helper function to fetch all miniatures with pagination
async function fetchAllMiniatures(query: any): Promise<any[]> {
  let allMiniatures: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await query.range(start, end);

    if (error) {
      console.error("Error fetching miniatures:", error);
      throw new Error(`Failed to fetch miniatures: ${error.message}`);
    }

    if (data && data.length > 0) {
      allMiniatures = allMiniatures.concat(data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allMiniatures;
}
