import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { GameBoxesTab, type GameBoxWithComponents } from "@/components/games/game-boxes-tab";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Boxes | Hobby Tracker",
  description: "Browse and inventory physical game boxes and components across all universes",
};

interface BoxesPageProps {
  searchParams: Promise<{
    universe?: string;
    sort?: string;
    search?: string;
  }>;
}

export default async function BoxesPage({ searchParams }: BoxesPageProps) {
  await requireAuth();
  const supabase = await createClient();
  const { universe: universeParam, sort: sortParam, search: searchParam } = await searchParams;

  // 1. Fetch all universes and game boxes with their relational hierarchy, and in-box storage IDs
  const [{ data: universes }, { data: rawGameBoxes }, { data: inBoxStorage }] = await Promise.all([
    supabase.from("universes").select("id, name").order("name", { ascending: true }),
    supabase
      .from("game_boxes")
      .select(
        `
        *,
        game:games!game_id(id, name, universe_id, sequence, universe:universes!universe_id(id, name)),
        edition:editions!edition_id(id, name, sequence, year),
        expansion:expansions!expansion_id(id, name, sequence, year),
        game_components(*)
      `
      )
      .order("name", { ascending: true }),
    supabase.from("storage_boxes").select("id").ilike("name", "in box"),
  ]);

  // Count miniatures stored "IN BOX" linked to each game box
  const inBoxStorageIds = (inBoxStorage || []).map((s) => s.id);
  const linkedMiniaturesCountByBoxId: Record<string, number> = {};

  if (inBoxStorageIds.length > 0) {
    const { data: linkedMiniatures } = await supabase
      .from("miniatures")
      .select("game_box_id, quantity")
      .in("storage_box_id", inBoxStorageIds)
      .not("game_box_id", "is", null);

    if (linkedMiniatures) {
      for (const m of linkedMiniatures) {
        if (m.game_box_id) {
          linkedMiniaturesCountByBoxId[m.game_box_id] =
            (linkedMiniaturesCountByBoxId[m.game_box_id] || 0) + (m.quantity || 1);
        }
      }
    }
  }

  // 2. Fetch component photos for all components in these boxes
  const allComponents = (rawGameBoxes || []).flatMap((b: any) => b.game_components || []);
  const allComponentIds = allComponents.map((c: any) => c.id).filter(Boolean);

  const photosByComponentId: Record<string, any[]> = {};
  if (allComponentIds.length > 0) {
    try {
      const { data: photosData, error: photosErr } = await supabase
        .from("game_component_photos")
        .select("*")
        .in("component_id", allComponentIds)
        .order("display_order", { ascending: true })
        .order("uploaded_at", { ascending: true });

      if (!photosErr && photosData) {
        for (const p of photosData) {
          if (!photosByComponentId[p.component_id]) {
            photosByComponentId[p.component_id] = [];
          }
          photosByComponentId[p.component_id].push(p);
        }
      }
    } catch {
      // Table may not exist or be accessible in schema cache, ignore gracefully
    }
  }

  // 3. Assemble game boxes with structured components and photos
  const gameBoxes: GameBoxWithComponents[] = (rawGameBoxes || []).map((b: any) => ({
    ...b,
    game: Array.isArray(b.game) ? b.game[0] : b.game,
    edition: Array.isArray(b.edition) ? b.edition[0] : b.edition,
    expansion: Array.isArray(b.expansion) ? b.expansion[0] : b.expansion,
    linked_miniatures_count: linkedMiniaturesCountByBoxId[b.id] || 0,
    game_components: (b.game_components || [])
      .map((comp: any) => {
        let photos = photosByComponentId[comp.id] || [];
        if (photos.length === 0 && comp.image_storage_path) {
          photos = [
            {
              id: comp.id,
              component_id: comp.id,
              storage_path: comp.image_storage_path,
              image_updated_at: comp.image_updated_at,
              display_order: 0,
              uploaded_at: comp.created_at,
              caption: null,
            },
          ];
        }
        return {
          ...comp,
          photos,
          game_component_photos: photos,
        };
      })
      .sort((a: any, b: any) => {
        const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const nameCmp = (a.name || "").localeCompare(b.name || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (nameCmp !== 0) return nameCmp;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }),
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <GameBoxesTab
        gameBoxes={gameBoxes}
        universes={universes || []}
        showUniverseFilter={true}
        showGameInfo={true}
        initialUniverseId={universeParam || "all"}
        initialSortBy={(sortParam as any) || "game"}
        initialSearchQuery={searchParam || ""}
      />
    </div>
  );
}
