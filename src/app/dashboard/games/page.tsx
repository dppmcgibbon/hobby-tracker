import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getUniverses } from "@/lib/queries/miniatures";
import { GameCard } from "@/components/games/game-card";
import { GameFormDialog } from "@/components/games/game-form-dialog";
import { GamesSearch } from "@/components/games/games-search";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2 } from "lucide-react";

async function GamesContent({ searchQuery, universeId, universes }: { searchQuery?: string; universeId?: string; universes: { id: string; name: string }[] }) {
  const supabase = await createClient();

  // Fetch games with edition counts and universe
  let query = supabase
    .from("games")
    .select(
      `
      *,
      editions(count),
      universe:universes(id, name)
    `
    )
    .order("name");

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  if (universeId && universeId !== "all") {
    query = query.eq("universe_id", universeId);
  }

  const { data: games } = await query;

  if (!games || games.length === 0) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No games found</h3>
        <p className="text-muted-foreground">
          {searchQuery ? "Try adjusting your search" : "Get started by adding your first game"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          universes={universes}
          editionCount={
            Array.isArray(game.editions) ? game.editions.length : game.editions?.[0]?.count || 0
          }
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; universe?: string }>;
}) {
  await requireAuth();
  const { search, universe } = await searchParams;
  const universes = await getUniverses();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="h-8 w-8" />
            Games
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your game systems, editions, and expansions
          </p>
        </div>
        <GameFormDialog universes={universes} />
      </div>

      {/* Search */}
      <GamesSearch universes={universes} />

      {/* Games Grid */}
      <Suspense fallback={<LoadingSkeleton />}>
        <GamesContent searchQuery={search} universeId={universe} universes={universes} />
      </Suspense>
    </div>
  );
}
