import { requireAuth } from "@/lib/auth/server";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { getStarredFilters } from "@/app/actions/saved-filters";
import { Star, Settings } from "lucide-react";
import { getR2PublicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default async function ShortcutsPage() {
  await requireAuth();

  // Get starred filters
  const starredFilters = await getStarredFilters();

  const buildShortcutUrl = (filters: Record<string, string>) => {
    const game = filters.gameId || filters.game;
    const edition = filters.editionId || filters.edition;
    const expansion = filters.expansionId || filters.expansion;
    const universe = filters.universeId || filters.universe;

    const hasGame = Boolean(game && game !== "all" && game !== "");
    const hasEdition = Boolean(edition && edition !== "all" && edition !== "");
    const hasExpansion = Boolean(expansion && expansion !== "all" && expansion !== "");

    if (hasGame || hasEdition || hasExpansion) {
      const params = new URLSearchParams();
      if (universe && universe !== "all" && universe !== "") {
        params.set("universe", universe);
      }
      if (hasGame) {
        params.set("game", game);
      }
      if (hasEdition) {
        params.set("edition", edition);
      }
      if (hasExpansion) {
        params.set("expansion", expansion);
      }
      return `/dashboard/games/detail?${params.toString()}`;
    }

    // Fallback to miniatures if no game, edition, or expansion is specified
    const params = new URLSearchParams();
    const keyMap: Record<string, string> = {
      search: "search",
      factionId: "faction",
      status: "status",
      tagId: "tag",
      storageBoxId: "storage",
      universeId: "universe",
      gameId: "game",
      editionId: "edition",
      expansionId: "expansion",
      unitType: "unit",
      baseSize: "base_size",
      hasPhotos: "photos",
      magnetised: "magnetised",
      based: "based",
    };
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        const paramName = keyMap[key] || key;
        params.set(paramName, value);
      }
    });
    return `/dashboard/miniatures?${params.toString()}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4 border-primary pl-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow">
            Shortcuts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Quick access to your favorite games and systems
          </p>
        </div>
        <Link
          href="/dashboard/admin/shortcuts"
          className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 border border-primary/30 rounded-sm px-3 py-1.5 hover:bg-primary/10 self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage
        </Link>
      </div>

      {starredFilters.length === 0 ? (
        <Card className="warhammer-card border-primary/30 p-12 text-center">
          <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-lg mb-2">
            No pinned shortcuts yet
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Pin your favorite games or configure custom logos in Admin.
          </p>
          <Link
            href="/dashboard/admin/shortcuts"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40 px-4 py-2 rounded-sm transition-colors"
          >
            Go to Shortcuts Management
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
          {starredFilters.map((filter) => {
            const logoSrc = filter.logo_url ? getR2PublicUrl(filter.logo_url) : null;
            return (
              <Link
                key={filter.id}
                href={buildShortcutUrl(filter.filters)}
                className="group block"
                title={filter.name}
              >
                {logoSrc ? (
                  <div className="relative aspect-[16/9] bg-black rounded-sm border-2 border-primary/30 hover:border-primary/70 transition-all hover:shadow-gold flex items-center justify-center p-2.5 sm:p-3">
                    <Image
                      src={logoSrc}
                      alt={filter.name}
                      width={400}
                      height={225}
                      unoptimized
                      className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[16/9] bg-black rounded-sm border-2 border-primary/30 hover:border-primary/70 transition-all hover:shadow-gold flex items-center justify-center p-2.5 sm:p-3">
                    <div className="text-center">
                      <Star className="h-8 w-8 mx-auto text-primary fill-primary" />
                      <p className="text-xs font-semibold text-primary mt-1.5 truncate">{filter.name}</p>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

