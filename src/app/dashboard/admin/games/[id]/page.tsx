import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getUniverses } from "@/lib/queries/miniatures";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GameFormDialog } from "@/components/games/game-form-dialog";
import { EditionFormDialog } from "@/components/games/edition-form-dialog";
import { ExpansionFormDialog } from "@/components/games/expansion-form-dialog";
import { DeleteEditionButton } from "@/components/games/delete-edition-button";
import { DeleteExpansionButton } from "@/components/games/delete-expansion-button";
import { Gamepad2, Edit, ChevronDown, ChevronRight, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Edition, Expansion } from "@/types";

export const dynamic = "force-dynamic";

type EditionWithExpansions = Edition & {
  expansions?: Expansion[];
};

async function GameDetailsContent({ id, universes }: { id: string; universes: { id: string; name: string }[] }) {
  const supabase = await createClient();

  // Fetch game with editions, expansions, and universe
  const { data: game } = await supabase
    .from("games")
    .select(
      `
      *,
      universe:universes(id, name),
      editions (
        *,
        expansions (*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!game) {
    notFound();
  }

  // Sort editions and expansions
  const sortedEditions: EditionWithExpansions[] =
    game.editions?.sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence) || [];
  sortedEditions.forEach((edition) => {
    if (edition.expansions) {
      edition.expansions.sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence);
    }
  });

  return (
    <div className="space-y-6 max-w-full">
      {/* Breadcrumbs & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
            Admin
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
          <Link href="/dashboard/admin/games" className="hover:text-primary transition-colors">
            Games Management
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
          <span className="text-primary">{game.name}</span>
        </div>
        <Link
          href="/dashboard/admin/games"
          className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Games
        </Link>
      </div>

      {/* Game Info Card */}
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-wider text-primary gold-glow">
                <Gamepad2 className="h-7 w-7 text-primary" />
                {game.name}
              </CardTitle>
              {(game as any).universe && (
                <div className="mt-2">
                  <Badge variant="outline" className="border-primary/40 text-xs">
                    {(game as any).universe.name}
                  </Badge>
                </div>
              )}
              {game.publisher && (
                <CardDescription className="mt-2 text-base">{game.publisher}</CardDescription>
              )}
            </div>
            <GameFormDialog
              game={game}
              universes={universes}
              trigger={
                <Button variant="outline" size="sm" className="border-primary/40 hover:bg-primary/10">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Game
                </Button>
              }
            />
          </div>
        </CardHeader>
        {game.description && (
          <CardContent>
            <p className="text-muted-foreground text-sm">{game.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Editions Section */}
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide text-primary">
                Editions
              </CardTitle>
              <CardDescription>
                {sortedEditions.length} {sortedEditions.length === 1 ? "edition" : "editions"} configured
              </CardDescription>
            </div>
            <EditionFormDialog gameId={game.id} />
          </div>
        </CardHeader>
        <CardContent>
          {sortedEditions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-base font-semibold">No editions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Edition" above to add the first edition for this game.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEditions.map((edition: EditionWithExpansions) => (
                <EditionCard key={edition.id} edition={edition} gameId={game.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditionCard({
  edition,
  gameId,
}: {
  edition: EditionWithExpansions;
  gameId: string;
}) {
  const expansionCount = edition.expansions?.length || 0;

  return (
    <Collapsible defaultOpen={expansionCount > 0} className="border border-primary/20 bg-background/50 rounded-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger className="hover:bg-primary/10 p-1.5 rounded-sm transition-colors">
                {expansionCount > 0 ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-30 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  {edition.name}
                  {edition.year && (
                    <span className="text-xs font-normal text-muted-foreground">({edition.year})</span>
                  )}
                </h3>
                {edition.description && (
                  <p className="text-xs text-muted-foreground mt-1">{edition.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {expansionCount} {expansionCount === 1 ? "expansion" : "expansions"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ExpansionFormDialog
              editionId={edition.id}
              trigger={
                <Button variant="outline" size="sm" className="h-8 text-xs border-primary/30 hover:bg-primary/10">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Expansion
                </Button>
              }
            />
            <EditionFormDialog
              gameId={gameId}
              edition={edition}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <DeleteEditionButton editionId={edition.id} editionName={edition.name} />
          </div>
        </div>
      </div>

      {expansionCount > 0 && (
        <CollapsibleContent>
          <div className="border-t border-primary/10 px-4 pb-4 bg-muted/10">
            <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground py-3">
              Expansions
            </h4>
            <div className="space-y-2">
              {edition.expansions?.map((expansion) => (
                <div
                  key={expansion.id}
                  className="flex items-start justify-between p-3 bg-background/80 border border-primary/10 rounded-sm"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-foreground">
                      {expansion.name}
                      {expansion.year && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          ({expansion.year})
                        </span>
                      )}
                    </div>
                    {expansion.description && (
                      <p className="text-xs text-muted-foreground mt-1">{expansion.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <ExpansionFormDialog
                      editionId={edition.id}
                      expansion={expansion}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <DeleteExpansionButton
                      expansionId={expansion.id}
                      expansionName={expansion.name}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="warhammer-card border-primary/20">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card className="warhammer-card border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const universes = await getUniverses();

  return (
    <div className="space-y-6 max-w-full">
      <Suspense fallback={<LoadingSkeleton />}>
        <GameDetailsContent id={id} universes={universes} />
      </Suspense>
    </div>
  );
}
