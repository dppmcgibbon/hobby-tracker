import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, BookOpen, Package, FileText, ImageIcon, Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GameLinksCard } from "@/components/games/game-links-card";
import { GamePdfsTab } from "@/components/games/game-pdfs-tab";
import { GameImagesTab } from "@/components/games/game-images-tab";
import { GameMiniaturesTab, type GameMiniatureItem } from "@/components/games/game-miniatures-tab";
import { GameBoxesTab } from "@/components/games/game-boxes-tab";
import { GameEditDialog } from "@/components/games/game-edit-dialog";
import {
  getGameDetails,
  type GameInfoLink,
  isGamePdfLink,
  isGameResourceLink,
  sortGamePdfLinks,
} from "@/lib/games/game-details";
import type { GameEntityType } from "@/app/actions/games";

export const dynamic = "force-dynamic";

interface GameDetailPageProps {
  searchParams: Promise<{
    universe?: string;
    game?: string;
    edition?: string;
    expansion?: string;
    tab?: string;
  }>;
}

export default async function GameDetailPage({ searchParams }: GameDetailPageProps) {
  await requireAuth();
  const supabase = await createClient();
  const {
    universe: universeIdParam,
    game: gameId,
    edition: editionId,
    expansion: expansionId,
    tab: tabParam,
  } = await searchParams;

  const validTab =
    tabParam && ["about", "pdfs", "images", "miniatures", "boxes"].includes(tabParam)
      ? tabParam
      : "about";

  const validExpansionId = expansionId && expansionId !== "all" ? expansionId : undefined;
  const validEditionId = editionId && editionId !== "all" ? editionId : undefined;
  const validGameId = gameId && gameId !== "all" ? gameId : undefined;
  const validUniverseId =
    universeIdParam && universeIdParam !== "all" ? universeIdParam : undefined;

  if (!validGameId && !validEditionId && !validExpansionId) {
    notFound();
  }

  // Fetch relevant entities including cover_image and links
  let expansion = null;
  let edition = null;
  let game = null;
  let universe = null;

  if (validExpansionId) {
    const { data: expData } = await supabase
      .from("expansions")
      .select("id, name, sequence, year, description, edition_id, cover_image, links")
      .eq("id", validExpansionId)
      .single();
    expansion = expData;
  }

  const resolvedEditionId = validEditionId || expansion?.edition_id;
  if (resolvedEditionId) {
    const { data: edData } = await supabase
      .from("editions")
      .select("id, name, sequence, year, description, game_id, cover_image, links")
      .eq("id", resolvedEditionId)
      .single();
    edition = edData;
  }

  // If no specific expansion was requested, but this edition has a sequence 1 Core Game
  // expansion that holds content/rules, fall back to it
  if (!expansion && resolvedEditionId) {
    const { data: coreExp } = await supabase
      .from("expansions")
      .select("id, name, sequence, year, description, edition_id, cover_image, links")
      .eq("edition_id", resolvedEditionId)
      .eq("sequence", 1)
      .maybeSingle();

    if (
      coreExp &&
      (!edition?.links || (Array.isArray(edition.links) && edition.links.length === 0)) &&
      !edition?.cover_image
    ) {
      expansion = coreExp;
    }
  }

  const resolvedGameId = validGameId || edition?.game_id;
  if (resolvedGameId) {
    const { data: gameData } = await supabase
      .from("games")
      .select("id, name, description, publisher, universe_id, cover_image, links")
      .eq("id", resolvedGameId)
      .single();
    game = gameData;
  }

  if (!game) {
    notFound();
  }

  const resolvedUniverseId = validUniverseId || game.universe_id;
  if (resolvedUniverseId) {
    const { data: uData } = await supabase
      .from("universes")
      .select("id, name")
      .eq("id", resolvedUniverseId)
      .single();
    universe = uData;
  }

  // Determine target item details & leaf type
  const isExpansion = Boolean(expansion);
  const isEdition = Boolean(!expansion && edition);

  const targetEntityType: GameEntityType = isExpansion
    ? "expansion"
    : isEdition
      ? "edition"
      : "game";

  const targetEntityId: string = isExpansion ? expansion!.id : isEdition ? edition!.id : game.id;

  const isCoreExpansion = expansion?.name?.toLowerCase() === "core game";

  const displayTitle = expansion
    ? isCoreExpansion
      ? `${game.name}: ${edition?.name || expansion.name}`
      : expansion.name
    : isEdition
      ? `${game.name}: ${edition?.name}`
      : game.name;

  const itemSubtitle = expansion
    ? isCoreExpansion
      ? `${game.name} • ${edition?.name || ""} Core Game`
      : `${game.name} • ${edition?.name || ""} Expansion`
    : isEdition
      ? `${game.name} Edition`
      : "Core Game System";

  const displayYear = expansion?.year || edition?.year || null;
  const targetCoverImage = expansion
    ? expansion.cover_image
    : isEdition
      ? edition?.cover_image
      : game.cover_image;

  const rawDescription = expansion?.description || edition?.description || game.description;

  const rawLinks = expansion ? expansion.links : isEdition ? edition?.links : game.links;

  const targetLinks: GameInfoLink[] = Array.isArray(rawLinks)
    ? (rawLinks as unknown as GameInfoLink[])
    : [];

  const metadata = getGameDetails(expansion?.name || game.name, rawDescription, targetLinks);

  // Separate PDF documents from general resource links
  const pdfLinks = metadata.links.filter(isGamePdfLink);
  const resourceLinks = metadata.links.filter(isGameResourceLink);

  const sortedPdfLinks = sortGamePdfLinks(pdfLinks);


  // URL for filtering miniatures of this game/edition/expansion
  const miniatureFilterParams = new URLSearchParams();
  if (resolvedUniverseId) miniatureFilterParams.set("universe", resolvedUniverseId);
  miniatureFilterParams.set("game", game.id);
  if (edition) miniatureFilterParams.set("edition", edition.id);
  if (expansion) miniatureFilterParams.set("expansion", expansion.id);
  const miniatureFilterUrl = `/dashboard/miniatures?${miniatureFilterParams.toString()}`;

  // Fetch miniatures associated with this game/edition/expansion
  let gameMiniaturesQuery = supabase
    .from("miniature_games")
    .select("miniature_id")
    .eq("game_id", game.id);

  if (expansion) {
    gameMiniaturesQuery = gameMiniaturesQuery.eq("expansion_id", expansion.id);
  } else if (edition) {
    gameMiniaturesQuery = gameMiniaturesQuery.eq("edition_id", edition.id);
  }

  const { data: linkedRows } = await gameMiniaturesQuery;
  const linkedMiniatureIds = Array.from(
    new Set((linkedRows || []).map((r) => r.miniature_id).filter(Boolean))
  );

  let gameMiniatures: GameMiniatureItem[] = [];
  if (linkedMiniatureIds.length > 0) {
    const { data: minData } = await supabase
      .from("miniatures")
      .select(
        `
        id,
        name,
        quantity,
        created_at,
        unit_type,
        factions (id, name),
        miniature_status (status, completed_at, based, magnetised),
        miniature_photos (id, storage_path, image_updated_at, display_order, uploaded_at),
        storage_boxes (id, name, location)
      `
      )
      .in("id", linkedMiniatureIds)
      .order("name");

    gameMiniatures = (minData || []).map((m) => {
      const faction = Array.isArray(m.factions) ? m.factions[0] : m.factions;
      const status = Array.isArray(m.miniature_status) ? m.miniature_status[0] : m.miniature_status;
      const storageBox = Array.isArray(m.storage_boxes) ? m.storage_boxes[0] : m.storage_boxes;
      return {
        id: m.id,
        name: m.name,
        quantity: m.quantity,
        created_at: m.created_at,
        unit_type: m.unit_type,
        factions: (faction || null) as { name: string } | null,
        miniature_status: (status || null) as {
          status: string;
          completed_at?: string | null;
          based?: boolean | null;
          magnetised?: boolean | null;
        } | null,
        miniature_photos: ((m.miniature_photos || []) as any[]).sort((a: any, b: any) => {
          const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
        }) as {
          storage_path: string;
          image_updated_at?: string | null;
        }[],
        storage_box: (storageBox || null) as {
          id: string;
          name: string;
          location?: string | null;
        } | null,
      };
    });
  }

  // Fetch available editions & expansions for this game
  const [{ data: availableEditions }, { data: availableExpansions }] = await Promise.all([
    supabase.from("editions").select("*").eq("game_id", game.id).order("sequence"),
    edition
      ? supabase.from("expansions").select("*").eq("edition_id", edition.id).order("sequence")
      : { data: [] },
  ]);

  // Fetch game boxes and components for this entity
  let gameBoxesQuery = supabase
    .from("game_boxes")
    .select("*, game_components(*)")
    .eq("game_id", game.id)
    .order("created_at", { ascending: true });

  if (expansion) {
    gameBoxesQuery = gameBoxesQuery.eq("expansion_id", expansion.id);
  } else if (edition) {
    gameBoxesQuery = gameBoxesQuery.eq("edition_id", edition.id);
  }

  const { data: rawGameBoxes } = await gameBoxesQuery;

  // Fetch photos for these components if game_component_photos table exists
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
      // Table may not exist yet in schema cache, ignore gracefully
    }
  }

  const gameBoxes = (rawGameBoxes || []).map((b: any) => ({
    ...b,
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
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }),
  }));

  return (
    <Tabs defaultValue={validTab} className="space-y-6 w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Link href="/dashboard/games" className="hover:text-primary transition-colors">
          Universes
        </Link>
        {universe && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
            <Link
              href={`/dashboard/games?universe=${universe.id}`}
              className="hover:text-primary transition-colors"
            >
              {universe.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
        <Link
          href={`/dashboard/games?universe=${resolvedUniverseId || ""}&game=${game.id}`}
          className="hover:text-primary transition-colors"
        >
          {game.name}
        </Link>
        {edition && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
            <Link
              href={`/dashboard/games?universe=${resolvedUniverseId || ""}&game=${game.id}&edition=${edition.id}`}
              className="hover:text-primary transition-colors"
            >
              {edition.name}
            </Link>
          </>
        )}
        {expansion && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-primary">{expansion.name}</span>
          </>
        )}
      </div>

      {/* Top Header */}
      <div className="flex flex-col gap-2 border-l-4 border-primary pl-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-widest text-primary">
            Game Detail
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-xs uppercase font-medium text-muted-foreground">
            {itemSubtitle}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow mt-1">
          {displayTitle}
        </h1>
      </div>

      {/* Full-Width Tabs Navigation Bar */}
      <TabsList className="bg-card/80 border border-primary/30 p-1 w-full justify-start h-auto flex flex-wrap gap-1">
        <TabsTrigger
          value="about"
          className="data-[state=active]:bg-primary data-[state=active]:text-black py-2 px-3 sm:px-4 cursor-pointer font-bold uppercase tracking-wider text-xs gap-2 flex items-center"
        >
          <BookOpen className="h-4 w-4" />
          <span>About</span>
        </TabsTrigger>
        <TabsTrigger
          value="pdfs"
          className="data-[state=active]:bg-primary data-[state=active]:text-black py-2 px-3 sm:px-4 cursor-pointer font-bold uppercase tracking-wider text-xs gap-2 flex items-center"
        >
          <FileText className="h-4 w-4" />
          <span>PDFs</span>
          {pdfLinks.length > 0 && (
            <span className="ml-1 text-[11px] opacity-80">({pdfLinks.length})</span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="images"
          className="data-[state=active]:bg-primary data-[state=active]:text-black py-2 px-3 sm:px-4 cursor-pointer font-bold uppercase tracking-wider text-xs gap-2 flex items-center"
        >
          <ImageIcon className="h-4 w-4" />
          <span>Images</span>
        </TabsTrigger>
        <TabsTrigger
          value="miniatures"
          className="data-[state=active]:bg-primary data-[state=active]:text-black py-2 px-3 sm:px-4 cursor-pointer font-bold uppercase tracking-wider text-xs gap-2 flex items-center"
        >
          <Package className="h-4 w-4" />
          <span>Miniatures</span>
          {gameMiniatures.length > 0 && (
            <span className="ml-1 text-[11px] opacity-80">({gameMiniatures.length})</span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="boxes"
          className="data-[state=active]:bg-primary data-[state=active]:text-black py-2 px-3 sm:px-4 cursor-pointer font-bold uppercase tracking-wider text-xs gap-2 flex items-center"
        >
          <Box className="h-4 w-4" />
          <span>Game Boxes & Components</span>
          {gameBoxes.length > 0 && (
            <span className="ml-1 text-[11px] opacity-80">({gameBoxes.length})</span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Tabs Contents - Full Width */}
      <TabsContent value="about" className="space-y-6 mt-0">
        {/* About The Game Text */}
        <Card className="warhammer-card border-primary/30 gap-0">
          <CardHeader className="pb-3 border-b border-primary/15 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                About The Game
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wide mt-1">
                Background lore and game overview
              </CardDescription>
            </div>

            {/* Edit Details button - icon only */}
            <GameEditDialog
              entityType={targetEntityType}
              entityId={targetEntityId}
              title={displayTitle}
              currentCoverImage={targetCoverImage}
              currentDescription={rawDescription}
              mode="description"
              triggerVariant="icon"
            />
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line">
              {metadata.description}
            </p>
          </CardContent>
        </Card>

        {/* Info & Resources Links Section - User Editable & Deletable */}
        <GameLinksCard
          entityType={targetEntityType}
          entityId={targetEntityId}
          links={resourceLinks}
        />
      </TabsContent>

      <TabsContent value="pdfs" className="mt-0">
        <GamePdfsTab
          entityType={targetEntityType}
          entityId={targetEntityId}
          links={metadata.links}
          gameTitle={displayTitle}
        />
      </TabsContent>

      <TabsContent value="images" className="mt-0">
        <GameImagesTab
          entityType={targetEntityType}
          entityId={targetEntityId}
          links={metadata.links}
          gameTitle={displayTitle}
        />
      </TabsContent>

      <TabsContent value="miniatures" className="mt-0">
        <GameMiniaturesTab
          miniatures={gameMiniatures}
          gameTitle={displayTitle}
          miniaturesFilterUrl={miniatureFilterUrl}
        />
      </TabsContent>

      <TabsContent value="boxes" className="mt-0">
        <GameBoxesTab
          gameId={game.id}
          editionId={edition?.id || null}
          expansionId={expansion?.id || null}
          gameTitle={displayTitle}
          gameBoxes={gameBoxes}
          availableEditions={availableEditions || []}
          availableExpansions={availableExpansions || []}
        />
      </TabsContent>
    </Tabs>
  );
}
