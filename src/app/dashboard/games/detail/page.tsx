import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Package,
  Edit3,
  Camera,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameCover } from "@/components/games/game-cover";
import { GameEditDialog } from "@/components/games/game-edit-dialog";
import { GameLinksCard } from "@/components/games/game-links-card";
import { getGameDetails, type GameInfoLink } from "@/lib/games/game-details";
import type { GameEntityType } from "@/app/actions/games";

export const dynamic = "force-dynamic";

interface GameDetailPageProps {
  searchParams: Promise<{
    universe?: string;
    game?: string;
    edition?: string;
    expansion?: string;
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
  } = await searchParams;

  if (!gameId && !editionId && !expansionId) {
    notFound();
  }

  // Fetch relevant entities including cover_image and links
  let expansion = null;
  let edition = null;
  let game = null;
  let universe = null;

  if (expansionId) {
    const { data: expData } = await supabase
      .from("expansions")
      .select("id, name, sequence, year, description, edition_id, cover_image, links")
      .eq("id", expansionId)
      .single();
    expansion = expData;
  }

  const resolvedEditionId = editionId || expansion?.edition_id;
  if (resolvedEditionId) {
    const { data: edData } = await supabase
      .from("editions")
      .select("id, name, sequence, year, description, game_id, cover_image, links")
      .eq("id", resolvedEditionId)
      .single();
    edition = edData;
  }

  const resolvedGameId = gameId || edition?.game_id;
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

  const resolvedUniverseId = universeIdParam || game.universe_id;
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

  const targetEntityId: string = isExpansion
    ? expansion!.id
    : isEdition
      ? edition!.id
      : game.id;

  const displayTitle = expansion
    ? expansion.name
    : isEdition
      ? `${game.name}: ${edition?.name}`
      : game.name;

  const itemSubtitle = expansion
    ? `${game.name} • ${edition?.name || ""} Expansion`
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

  const rawLinks = expansion
    ? expansion.links
    : isEdition
      ? edition?.links
      : game.links;

  const targetLinks: GameInfoLink[] = Array.isArray(rawLinks)
    ? (rawLinks as unknown as GameInfoLink[])
    : [];

  const metadata = getGameDetails(expansion?.name || game.name, rawDescription, targetLinks);

  // Compute back link destination
  let backHref = "/dashboard/games";
  let backLabel = "Back to Universes";
  if (expansion) {
    backHref = `/dashboard/games?universe=${resolvedUniverseId || ""}&game=${game.id}&edition=${edition?.id || ""}`;
    backLabel = `Back to ${edition?.name || "Editions"}`;
  } else if (isEdition) {
    backHref = `/dashboard/games?universe=${resolvedUniverseId || ""}&game=${game.id}`;
    backLabel = `Back to ${game.name}`;
  } else if (resolvedUniverseId) {
    backHref = `/dashboard/games?universe=${resolvedUniverseId}`;
    backLabel = `Back to ${universe?.name || "Games"}`;
  }

  // URL for filtering miniatures of this game/edition/expansion
  const miniatureFilterParams = new URLSearchParams();
  if (resolvedUniverseId) miniatureFilterParams.set("universe", resolvedUniverseId);
  miniatureFilterParams.set("game", game.id);
  if (edition) miniatureFilterParams.set("edition", edition.id);
  if (expansion) miniatureFilterParams.set("expansion", expansion.id);
  const miniatureFilterUrl = `/dashboard/miniatures?${miniatureFilterParams.toString()}`;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
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

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
        <div>
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

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Edit Details Dialog Button */}
          <GameEditDialog
            entityType={targetEntityType}
            entityId={targetEntityId}
            title={displayTitle}
            currentCoverImage={targetCoverImage}
            currentDescription={rawDescription}
            trigger={
              <Button
                variant="outline"
                className="border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider px-3.5 py-2 h-auto text-primary"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Edit Details
              </Button>
            }
          />

          <Link
            href={backHref}
            className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-2 rounded border border-primary/20 hover:border-primary/40 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cover Image Box/Book */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <GameCover
            title={displayTitle}
            subtitle={itemSubtitle}
            universeName={universe?.name}
            coverUrl={metadata.coverUrl}
            coverImage={targetCoverImage}
            coverType={metadata.coverType}
            year={displayYear}
          />

          <div className="mt-5 w-full max-w-[340px] space-y-2">
            {/* Direct Cover Upload/Edit Trigger under the Cover */}
            <GameEditDialog
              entityType={targetEntityType}
              entityId={targetEntityId}
              title={displayTitle}
              currentCoverImage={targetCoverImage}
              currentDescription={rawDescription}
              trigger={
                <Button
                  variant="outline"
                  className="w-full border-primary/30 hover:border-primary hover:bg-primary/10 font-bold uppercase text-xs tracking-wider"
                >
                  <Camera className="h-4 w-4 mr-2 text-primary" />
                  {targetCoverImage ? "Change Cover Image" : "Upload Cover Image"}
                </Button>
              }
            />

            <Button
              asChild
              variant="outline"
              className="w-full border-primary/20 hover:border-primary hover:bg-primary/10 font-bold uppercase text-xs tracking-wider"
            >
              <Link href={miniatureFilterUrl}>
                <Package className="h-4 w-4 mr-2 text-primary" />
                View Miniatures
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Column: Game Information, Text & Links */}
        <div className="lg:col-span-8 space-y-6">

          {/* About The Game Text */}
          <Card className="warhammer-card border-primary/30">
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

              {/* Edit text quick button */}
              <GameEditDialog
                entityType={targetEntityType}
                entityId={targetEntityId}
                title={displayTitle}
                currentCoverImage={targetCoverImage}
                currentDescription={rawDescription}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1 text-primary" />
                    Edit
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line">
                {metadata.description}
              </p>
            </CardContent>
          </Card>

          {/* Info & Resources Links Section - User Editable & Deletable */}
          <GameLinksCard
            entityType={targetEntityType}
            entityId={targetEntityId}
            links={metadata.links}
          />
        </div>
      </div>
    </div>
  );
}
