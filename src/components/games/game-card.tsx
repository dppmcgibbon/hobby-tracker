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
  onUpdate?: () => void;
}

export function GameCard({ game, editionCount = 0, onUpdate }: GameCardProps) {
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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/dashboard/games/${game.id}`}>
              <CardTitle className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                <Gamepad2 className="h-5 w-5" />
                {game.name}
              </CardTitle>
            </Link>
            {game.publisher && <CardDescription className="mt-1">{game.publisher}</CardDescription>}
          </div>
          <div className="flex gap-1">
            <GameFormDialog
              game={game}
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
