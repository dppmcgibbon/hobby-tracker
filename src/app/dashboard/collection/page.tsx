import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { CollectionClient } from "./collection-client";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch factions for filter dropdown
  const { data: factions } = await supabase.from("factions").select("id, name").order("name");

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
  if (searchParams.search) {
    query = query.ilike("name", `%${searchParams.search}%`);
  }

  // Apply faction filter
  if (searchParams.faction && searchParams.faction !== "all") {
    query = query.eq("faction_id", searchParams.faction);
  }

  // Apply status filter
  if (searchParams.status && searchParams.status !== "all") {
    // Note: This requires a join or separate query for status
    // For now, we'll filter client-side or adjust the query structure
  }

  // Apply sorting
  const sortBy = searchParams.sortBy || "created_at";
  const sortOrder = (searchParams.sortOrder || "desc") as "asc" | "desc";

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

  if (searchParams.status && searchParams.status !== "all") {
    filteredMiniatures = filteredMiniatures.filter((m) => {
      const status = m.miniature_status?.status || "backlog";
      return status === searchParams.status;
    });
  }

  return (
    <CollectionClient
      miniatures={filteredMiniatures}
      factions={factions || []}
      initialFilters={{
        search: searchParams.search || "",
        factionId: searchParams.faction || "all",
        status: searchParams.status || "all",
        sortBy: searchParams.sortBy || "created_at",
        sortOrder: (searchParams.sortOrder as "asc" | "desc") || "desc",
      }}
    />
  );
}
