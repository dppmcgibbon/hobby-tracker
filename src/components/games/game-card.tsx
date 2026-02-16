"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Edit, Trash2 } from "lucide-react";
import type { Game } from "@/types";
import { GameFormDialog } from "./game-form-dialog";
import { deleteGame } from "@/app/actions/games";
import { toast } from "sonner";
import { useState } from "react";
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

interface GameCardProps {
  game: Game;
  editionCount?: number;
  universes?: { id: string; name: string }[];
  onUpdate?: () => void;
}

export function GameCard({ game, editionCount = 0, universes = [], onUpdate }: GameCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteGame(game.id);
      toast.success("Game deleted successfully");
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete game");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
                <Gamepad2 className="h-6 w-6 text-blue-500" />
              </div>
              <Link href={`/dashboard/games/${game.id}`}>
                <CardTitle className="text-xl uppercase tracking-wide hover:text-primary transition-colors cursor-pointer">
                  {game.name}
                </CardTitle>
              </Link>
            </div>
            {(game as any).universe && (
              <div className="mb-2">
                <Badge variant="outline" className="text-xs">
                  {(game as any).universe.name}
                </Badge>
              </div>
            )}
            {game.publisher && <CardDescription className="text-base">{game.publisher}</CardDescription>}
          </div>
          <div className="flex gap-1">
            <GameFormDialog
              game={game}
              universes={universes}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
              }
              onSuccess={onUpdate}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {game.name} and all its editions and expansions.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {game.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{game.description}</p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {editionCount} {editionCount === 1 ? "Edition" : "Editions"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
