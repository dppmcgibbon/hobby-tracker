import { requireAuth } from "@/lib/auth/server";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { getStarredFilters } from "@/app/actions/saved-filters";
import { Star } from "lucide-react";

export default async function ShortcutsPage() {
  await requireAuth();

  // Get starred filters
  const starredFilters = await getStarredFilters();

  const getFilterSummary = (filters: Record<string, string>) => {
    const activeFilters = Object.entries(filters)
      .filter(([key, value]) => value && value !== "all" && value !== "")
      .map(([key, value]) => {
        // Convert filter keys to readable labels
        const labels: Record<string, string> = {
          search: "Search",
          factionId: "Faction",
          status: "Status",
          tagId: "Tag",
          storageBoxId: "Storage",
          universeId: "Universe",
          gameId: "Game",
          editionId: "Edition",
          expansionId: "Expansion",
          unitType: "Unit Type",
          baseSize: "Base Size",
          hasPhotos: "Photos",
          magnetised: "Magnetised",
          based: "Based",
        };
        return labels[key] || key;
      });
    return activeFilters.slice(0, 3).join(", ") + (activeFilters.length > 3 ? "..." : "");
  };

  const buildFilterUrl = (filters: Record<string, string>) => {
    const params = new URLSearchParams();
    
    // Map filter keys to URL parameter names
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
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Shortcuts
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Quick access to your starred filter combinations
        </p>
      </div>

      {starredFilters.length === 0 ? (
        <Card className="warhammer-card border-primary/30 p-12 text-center">
          <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-lg mb-2">
            No starred shortcuts yet
          </p>
          <p className="text-sm text-muted-foreground">
            Go to the Miniatures page, apply filters, save them, and star your favorites to see them here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {starredFilters.map((filter) => (
            <Link
              key={filter.id}
              href={buildFilterUrl(filter.filters)}
              className="group block"
              title={filter.name}
            >
              {filter.logo_url ? (
                <div className="relative aspect-[16/9] bg-black rounded-sm border-2 border-primary/30 hover:border-primary/70 transition-all hover:shadow-gold flex items-center justify-center p-4">
                  <Image
                    src={filter.logo_url}
                    alt={filter.name}
                    width={500}
                    height={300}
                    unoptimized
                    className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-black rounded-sm border-2 border-primary/30 hover:border-primary/70 transition-all hover:shadow-gold flex items-center justify-center p-4">
                  <div className="text-center">
                    <Star className="h-12 w-12 mx-auto text-primary fill-primary" />
                    <p className="text-sm font-semibold text-primary mt-2">{filter.name}</p>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
