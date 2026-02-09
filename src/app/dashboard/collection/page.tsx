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
    { data: unitTypesData },
    { data: basesData },
    { data: baseShapesData },
    { data: baseTypesData },
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
    supabase
      .from("miniatures")
      .select("unit_type")
      .eq("user_id", user.id)
      .not("unit_type", "is", null),
    supabase
      .from("bases")
      .select("id, name")
      .order("name"),
    supabase
      .from("base_shapes")
      .select("id, name")
      .order("name"),
    supabase
      .from("base_types")
      .select("id, name")
      .order("name"),
  ]);

  // Normalize recipes data
  const recipes = (recipesData || []).map((r) => ({
    id: r.id,
    name: r.name,
    faction: Array.isArray(r.faction) ? r.faction[0] : r.faction,
  }));

  // Get unique unit types
  const unitTypes = Array.from(
    new Set(
      (unitTypesData || [])
        .map((m) => m.unit_type)
        .filter((ut): ut is string => ut !== null && ut !== "")
    )
  ).sort();

  // Get all bases for the filter
  const bases = basesData || [];
  const baseShapes = baseShapesData || [];
  const baseTypes = baseTypesData || [];

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
      unit_type,
      base_id,
      base_shape_id,
      base_type_id,
      factions (id, name),
      miniature_status (status, completed_at, magnetised, based),
      miniature_photos (id, storage_path),
      bases (id, name),
      base_shapes (id, name),
      base_types (id, name)
    `
    )
    .eq("user_id", user.id);

  // Apply search filter
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Apply unit type filter
  if (params.unit) {
    query = query.eq("unit_type", params.unit);
  }

  // Apply faction filter
  if (params.faction && params.faction !== "all") {
    query = query.eq("faction_id", params.faction);
  }

  // Apply base filter
  if (params.base_size && params.base_size !== "all") {
    if (params.base_size === "none") {
      query = query.is("base_id", null);
    } else {
      query = query.eq("base_id", params.base_size);
    }
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
    if (params.game === "none") {
      // Filter for miniatures with NO game links
      const { data: allGameMiniatures } = await supabase
        .from("miniature_games")
        .select("miniature_id");
      
      if (allGameMiniatures) {
        // Get all miniature IDs that have game links
        const miniaturesWithGames = new Set(allGameMiniatures.map((g) => g.miniature_id));
        
        // Filter will be applied client-side to exclude these IDs
        gameFilteredMiniatureIds = miniaturesWithGames;
      }
    } else {
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
  }

  // Fetch editions if game filter is active (but not for "none")
  let editions: { id: string; name: string; year: number | null }[] = [];
  if (params.game && params.game !== "all" && params.game !== "none") {
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

  // Apply sorting - for now just get data, we'll sort client-side
  // Only apply basic ordering to ensure consistent results
  query = query.order("created_at", { ascending: false });

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
    miniature_photos: m.miniature_photos || [],
    storage_box: Array.isArray(m.storage_boxes) ? m.storage_boxes[0] : m.storage_boxes,
    bases: Array.isArray(m.bases) ? m.bases[0] : m.bases,
    base_shapes: Array.isArray(m.base_shapes) ? m.base_shapes[0] : m.base_shapes,
    base_types: Array.isArray(m.base_types) ? m.base_types[0] : m.base_types,
  }));

  // Apply tag filter
  if (tagFilteredMiniatureIds) {
    filteredMiniatures = filteredMiniatures.filter((m) => tagFilteredMiniatureIds.has(m.id));
  }

  // Apply game filter
  if (gameFilteredMiniatureIds) {
    if (params.game === "none") {
      // For "none", exclude miniatures that have game links
      filteredMiniatures = filteredMiniatures.filter((m) => !gameFilteredMiniatureIds.has(m.id));
    } else {
      // For specific games, include only miniatures with game links
      filteredMiniatures = filteredMiniatures.filter((m) => gameFilteredMiniatureIds.has(m.id));
    }
  }

  // Apply status filter
  if (params.status && params.status !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const status = m.miniature_status?.status || "backlog";
      return status === params.status;
    });
  }

  // Apply photo filter
  if (params.photos && params.photos !== "all") {
    if (params.photos === "no") {
      filteredMiniatures = filteredMiniatures.filter((m) => {
        const hasPhotos = m.miniature_photos && m.miniature_photos.length > 0;
        return !hasPhotos;
      });
    } else if (params.photos === "yes") {
      filteredMiniatures = filteredMiniatures.filter((m) => {
        return m.miniature_photos && m.miniature_photos.length > 0;
      });
    }
  }

  // Apply sorting - default is faction, unit, name
  const sortBy = params.sortBy || "faction-unit-name";
  const sortOrder = (params.sortOrder || "asc") as "asc" | "desc";

  filteredMiniatures.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "faction-unit-name":
        // Sort by faction, then unit, then name
        const factionA = a.factions?.name || "";
        const factionB = b.factions?.name || "";
        comparison = factionA.localeCompare(factionB);
        if (comparison === 0) {
          const unitA = a.unit_type || "";
          const unitB = b.unit_type || "";
          comparison = unitA.localeCompare(unitB);
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name);
          }
        }
        break;
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "faction":
        const facA = a.factions?.name || "";
        const facB = b.factions?.name || "";
        comparison = facA.localeCompare(facB);
        break;
      case "unit":
        const uA = a.unit_type || "";
        const uB = b.unit_type || "";
        comparison = uA.localeCompare(uB);
        break;
      case "status":
        const statusA = a.miniature_status?.status || "backlog";
        const statusB = b.miniature_status?.status || "backlog";
        comparison = statusA.localeCompare(statusB);
        break;
      case "quantity":
        comparison = (a.quantity || 0) - (b.quantity || 0);
        break;
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

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
      unitTypes={unitTypes}
      bases={bases}
      baseShapes={baseShapes}
      baseTypes={baseTypes}
      initialFilters={{
        search: params.search || "",
        factionId: params.faction || "all",
        status: params.status || "all",
        tagId: params.tag || "all",
        storageBoxId: params.storage || "all",
        gameId: params.game || "all",
        editionId: params.edition || "all",
        expansionId: params.expansion || "all",
        unitType: params.unit || "all",
        baseSize: params.base_size || "all",
        hasPhotos: params.photos || "all",
        sortBy: params.sortBy || "faction-unit-name",
        sortOrder: (params.sortOrder as "asc" | "desc") || "asc",
      }}
    />
  );
}
