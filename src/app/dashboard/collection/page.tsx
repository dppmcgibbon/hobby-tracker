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

  // Fetch factions and tags for filter dropdown
  const [{ data: factions }, { data: tags }, { data: collections }] = await Promise.all([
    supabase.from("factions").select("id, name").order("name"),
    supabase.from("tags").select("id, name, color").eq("user_id", user.id).order("name"),
    supabase.from("collections").select("id, name").eq("user_id", user.id).order("name"),
  ]);

  // Build query with filters
  let query = supabase
    .from("miniatures")
    .select(
      `
      id,
      name,
      quantity,
      created_at,
      factions (id, name),
      miniature_status (status, completed_at),
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
    console.error("Error fetching miniatures:", error);
  }

  // Log first miniature to see the structure
  if (miniatures && miniatures.length > 0) {
    console.log("First miniature photos:", miniatures[0].miniature_photos);
  }

  // Client-side status filtering if needed
  let filteredMiniatures = (miniatures || []).map((m) => ({
    ...m,
    factions: Array.isArray(m.factions) ? m.factions[0] : m.factions,
    miniature_status: Array.isArray(m.miniature_status)
      ? m.miniature_status[0]
      : m.miniature_status,
    miniature_photos: Array.isArray(m.miniature_photos) ? m.miniature_photos : [],
  }));

  // Apply tag filter
  if (tagFilteredMiniatureIds) {
    filteredMiniatures = filteredMiniatures.filter((m) => tagFilteredMiniatureIds.has(m.id));
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
      initialFilters={{
        search: params.search || "",
        factionId: params.faction || "all",
        status: params.status || "all",
        tagId: params.tag || "all",
        sortBy: params.sortBy || "created_at",
        sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
      }}
    />
  );
}
