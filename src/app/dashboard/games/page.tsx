import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Gamepad2, ChevronRight, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface GamesPageProps {
  searchParams: Promise<{
    universe?: string;
    game?: string;
    edition?: string;
  }>;
}

export default async function GamesPage({ searchParams }: GamesPageProps) {
  await requireAuth();
  const supabase = await createClient();
  const { universe: universeId, game: gameId, edition: editionId } = await searchParams;

  // Level 4: Expansions list for a specific edition
  // (Clicking an expansion routes to the Game Detail Page)
  if (editionId && gameId) {
    const [{ data: universe }, { data: game }, { data: edition }, { data: expansions }] =
      await Promise.all([
        universeId
          ? supabase.from("universes").select("id, name").eq("id", universeId).single()
          : Promise.resolve({ data: null }),
        supabase.from("games").select("id, name, universe_id").eq("id", gameId).single(),
        supabase.from("editions").select("id, name, year").eq("id", editionId).single(),
        supabase
          .from("expansions")
          .select("id, name, sequence, year")
          .eq("edition_id", editionId)
          .order("sequence", { ascending: true }),
      ]);

    const resolvedUniverseId = universeId || game?.universe_id || "";

    return (
      <div className="space-y-6 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Link href="/dashboard/games" className="hover:text-primary transition-colors">
            Universes
          </Link>
          {universe && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
              <Link
                href={`/dashboard/games?universe=${resolvedUniverseId}`}
                className="hover:text-primary transition-colors"
              >
                {universe.name}
              </Link>
            </>
          )}
          {game && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
              <Link
                href={`/dashboard/games?universe=${resolvedUniverseId}&game=${game.id}`}
                className="hover:text-primary transition-colors"
              >
                {game.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
          <span className="text-primary">{edition?.name || "Edition"}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              {edition?.name || "Expansions"}
            </h1>
          </div>
          <Link
            href={`/dashboard/games?universe=${resolvedUniverseId}&game=${gameId}`}
            className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editions
          </Link>
        </div>

        {/* Expansions Table */}
        <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-muted/30">
                <TableHead className="font-bold uppercase text-xs tracking-wide text-primary px-4 py-3">
                  Expansion
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!expansions || expansions.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                    No expansions found for this edition.
                  </TableCell>
                </TableRow>
              ) : (
                expansions.map((exp) => (
                  <TableRow
                    key={exp.id}
                    className="border-primary/10 hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="p-0">
                      <Link
                        href={`/dashboard/games/detail?universe=${resolvedUniverseId}&game=${gameId}&edition=${editionId}&expansion=${exp.id}`}
                        className="block w-full px-4 py-3.5 font-bold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
                      >
                        {exp.name}
                        {exp.year && (
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            ({exp.year})
                          </span>
                        )}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Level 3: Editions list for a specific game
  // (If an edition has no expansions, clicking it routes to the Game Detail Page)
  if (gameId) {
    const [{ data: universe }, { data: game }, { data: editions }] = await Promise.all([
      universeId
        ? supabase.from("universes").select("id, name").eq("id", universeId).single()
        : Promise.resolve({ data: null }),
      supabase.from("games").select("id, name, universe_id").eq("id", gameId).single(),
      supabase
        .from("editions")
        .select("id, name, sequence, year, expansions(id)")
        .eq("game_id", gameId)
        .order("sequence", { ascending: true }),
    ]);

    const resolvedUniverseId = universeId || game?.universe_id || "";

    return (
      <div className="space-y-6 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Link href="/dashboard/games" className="hover:text-primary transition-colors">
            Universes
          </Link>
          {universe && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
              <Link
                href={`/dashboard/games?universe=${resolvedUniverseId}`}
                className="hover:text-primary transition-colors"
              >
                {universe.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
          <span className="text-primary">{game?.name || "Game"}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              {game?.name || "Editions"}
            </h1>
          </div>
          {resolvedUniverseId && (
            <Link
              href={`/dashboard/games?universe=${resolvedUniverseId}`}
              className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
          )}
        </div>

        {/* Editions Table */}
        <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-muted/30">
                <TableHead className="font-bold uppercase text-xs tracking-wide text-primary px-4 py-3">
                  Edition
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!editions || editions.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                    No editions found for this game.
                  </TableCell>
                </TableRow>
              ) : (
                editions.map((edition) => {
                  const hasExpansions = edition.expansions && edition.expansions.length > 0;
                  const href = hasExpansions
                    ? `/dashboard/games?universe=${resolvedUniverseId}&game=${gameId}&edition=${edition.id}`
                    : `/dashboard/games/detail?universe=${resolvedUniverseId}&game=${gameId}&edition=${edition.id}`;

                  return (
                    <TableRow
                      key={edition.id}
                      className="border-primary/10 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="p-0">
                        <Link
                          href={href}
                          className="block w-full px-4 py-3.5 font-bold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
                        >
                          {edition.name}
                          {edition.year && (
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                              ({edition.year})
                            </span>
                          )}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Level 2: Games list for a specific universe
  // (If a game has no editions, clicking it routes directly to the Game Detail Page)
  if (universeId) {
    const [{ data: universe }, { data: games }] = await Promise.all([
      supabase.from("universes").select("id, name").eq("id", universeId).single(),
      supabase
        .from("games")
        .select("id, name, editions(id)")
        .eq("universe_id", universeId)
        .order("name", { ascending: true }),
    ]);

    return (
      <div className="space-y-6 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Link href="/dashboard/games" className="hover:text-primary transition-colors">
            Universes
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
          <span className="text-primary">{universe?.name || "Universe"}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              {universe?.name || "Games"}
            </h1>
          </div>
          <Link
            href="/dashboard/games"
            className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Universes
          </Link>
        </div>

        {/* Games Table */}
        <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-muted/30">
                <TableHead className="font-bold uppercase text-xs tracking-wide text-primary px-4 py-3">
                  Game
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!games || games.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                    No games found in this universe.
                  </TableCell>
                </TableRow>
              ) : (
                games.map((game) => {
                  const hasEditions = game.editions && game.editions.length > 0;
                  const href = hasEditions
                    ? `/dashboard/games?universe=${universeId}&game=${game.id}`
                    : `/dashboard/games/detail?universe=${universeId}&game=${game.id}`;

                  return (
                    <TableRow
                      key={game.id}
                      className="border-primary/10 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="p-0">
                        <Link
                          href={href}
                          className="block w-full px-4 py-3.5 font-bold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Level 1: Universes list (Default)
  const { data: universes, error } = await supabase
    .from("universes")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6 w-full">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          Games
        </h1>
      </div>

      {/* Universes Table */}
      <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden w-full">
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20 hover:bg-muted/30">
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary px-4 py-3">
                Universe
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {universes?.map((universe) => (
              <TableRow
                key={universe.id}
                className="border-primary/10 hover:bg-muted/20 transition-colors"
              >
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/games?universe=${universe.id}`}
                    className="block w-full px-4 py-3.5 font-bold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
                  >
                    {universe.name}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
