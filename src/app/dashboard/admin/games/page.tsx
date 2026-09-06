import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getUniverses } from "@/lib/queries/miniatures";
import { GameCard } from "@/components/games/game-card";
import { GameFormDialog } from "@/components/games/game-form-dialog";
import { GamesSearch } from "@/components/games/games-search";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface AdminGamesPageProps {
  searchParams: Promise<{
    search?: string;
    universe?: string;
  }>;
}

async function GamesContent({
  searchQuery,
  universeId,
  universes,
}: {
  searchQuery?: string;
  universeId?: string;
  universes: { id: string; name: string }[];
}) {
  const supabase = await createClient();

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
      <div className="warhammer-card border-primary/30 p-12 text-center rounded-sm">
        <Gamepad2 className="mx-auto h-12 w-12 text-primary opacity-40 mb-3" />
        <h3 className="text-lg font-bold uppercase tracking-wider text-primary">No games found</h3>
        <p className="text-muted-foreground text-sm mt-1">
          {searchQuery || (universeId && universeId !== "all")
            ? "Try adjusting your search or universe filter."
            : "Get started by clicking 'Add Game' to create your first game system."}
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
            Array.isArray(game.editions)
              ? game.editions.length
              : game.editions?.[0]?.count || 0
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
        <Card key={i} className="warhammer-card border-primary/20">
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

export default async function AdminGamesPage({ searchParams }: AdminGamesPageProps) {
  await requireAuth();
  const { search, universe } = await searchParams;
  const universes = await getUniverses();

  return (
    <div className="space-y-6 max-w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
        <span className="text-primary">Games Management</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-primary" />
            Games Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create and manage game systems, editions, and expansions
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/dashboard/admin"
            className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <GameFormDialog universes={universes} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="warhammer-card border-primary/30 p-4 rounded-sm">
        <GamesSearch universes={universes} basePath="/dashboard/admin/games" />
      </div>

      {/* Games Grid */}
      <Suspense fallback={<LoadingSkeleton />}>
        <GamesContent searchQuery={search} universeId={universe} universes={universes} />
      </Suspense>
    </div>
  );
}
