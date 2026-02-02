import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GameFormDialog } from "@/components/games/game-form-dialog";
import { EditionFormDialog } from "@/components/games/edition-form-dialog";
import { ExpansionFormDialog } from "@/components/games/expansion-form-dialog";
import { deleteEdition, deleteExpansion } from "@/app/actions/games";
import { Gamepad2, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

async function GameDetailsContent({ id }: { id: string }) {
  const supabase = await createClient();

  // Fetch game with editions and expansions
  const { data: game } = await supabase
    .from("games")
    .select(
      `
      *,
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
  const sortedEditions = game.editions?.sort((a, b) => a.sequence - b.sequence) || [];
  sortedEditions.forEach((edition) => {
    if (edition.expansions) {
      edition.expansions.sort((a, b) => a.sequence - b.sequence);
    }
  });

  return (
    <div className="space-y-6">
      {/* Game Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Gamepad2 className="h-6 w-6" />
                {game.name}
              </CardTitle>
              {game.publisher && (
                <CardDescription className="mt-2 text-base">{game.publisher}</CardDescription>
              )}
            </div>
            <GameFormDialog
              game={game}
              trigger={
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              }
            />
          </div>
        </CardHeader>
        {game.description && (
          <CardContent>
            <p className="text-muted-foreground">{game.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Editions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Editions</CardTitle>
              <CardDescription>
                {sortedEditions.length} {sortedEditions.length === 1 ? "edition" : "editions"}
              </CardDescription>
            </div>
            <EditionFormDialog gameId={game.id} />
          </div>
        </CardHeader>
        <CardContent>
          {sortedEditions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No editions yet. Add your first edition above.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedEditions.map((edition) => (
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
  edition: {
    id: string;
    name: string;
    sequence: number;
    year: number | null;
    description: string | null;
    expansions?: Array<{
      id: string;
      name: string;
      sequence: number;
      year: number | null;
      description: string | null;
    }>;
  };
  gameId: string;
}) {
  const expansionCount = edition.expansions?.length || 0;

  return (
    <Collapsible defaultOpen={expansionCount > 0} className="border rounded-lg">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger className="hover:bg-muted p-1 rounded">
                {expansionCount > 0 ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-30" />
                )}
              </CollapsibleTrigger>
              <div>
                <h3 className="font-semibold">
                  {edition.name}
                  {edition.year && (
                    <span className="text-muted-foreground ml-2">({edition.year})</span>
                  )}
                </h3>
                {edition.description && (
                  <p className="text-sm text-muted-foreground mt-1">{edition.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">{expansionCount} expansions</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <EditionFormDialog
              gameId={gameId}
              edition={edition}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Edition?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {edition.name} and all its expansions. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteEdition(edition.id);
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {expansionCount > 0 && (
        <CollapsibleContent>
          <div className="border-t px-4 pb-4">
            <div className="flex items-center justify-between py-3">
              <h4 className="text-sm font-medium">Expansions</h4>
              <ExpansionFormDialog editionId={edition.id} />
            </div>
            <div className="space-y-2">
              {edition.expansions?.map((expansion) => (
                <div
                  key={expansion.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {expansion.name}
                      {expansion.year && (
                        <span className="text-muted-foreground ml-2">({expansion.year})</span>
                      )}
                    </div>
                    {expansion.description && (
                      <p className="text-xs text-muted-foreground mt-1">{expansion.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <ExpansionFormDialog
                      editionId={edition.id}
                      expansion={expansion}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit className="h-3 w-3" />
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Expansion?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {expansion.name}. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteExpansion(expansion.id);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
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

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<LoadingSkeleton />}>
        <GameDetailsContent id={id} />
      </Suspense>
    </div>
  );
}
