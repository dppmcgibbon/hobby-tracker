"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameSelector } from "./game-selector";
import { linkMiniatureToGame, unlinkMiniatureFromGame } from "@/app/actions/games";
import { toast } from "sonner";
import { Gamepad2, Plus, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Game, Edition, Expansion } from "@/types";

interface GameLinkManagerProps {
  miniatureId: string;
  currentLinks: Array<{
    game_id: string;
    edition_id: string | null;
    expansion_id: string | null;
    games: Game;
    editions?: Edition | null;
    expansions?: Expansion | null;
  }>;
}

export function GameLinkManager({ miniatureId, currentLinks }: GameLinkManagerProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [selectedExpansionId, setSelectedExpansionId] = useState<string | null>(null);

  const handleLink = async () => {
    if (!selectedGameId) {
      toast.error("Please select a game");
      return;
    }

    setIsLoading(true);
    try {
      await linkMiniatureToGame({
        miniature_id: miniatureId,
        game_id: selectedGameId,
        edition_id: selectedEditionId,
        expansion_id: selectedExpansionId,
      });
      toast.success("Game linked successfully");
      setOpen(false);
      setSelectedGameId(null);
      setSelectedEditionId(null);
      setSelectedExpansionId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link game");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async (gameId: string) => {
    try {
      await unlinkMiniatureFromGame(miniatureId, gameId);
      toast.success("Game unlinked successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlink game");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Linked Games
            </CardTitle>
            <CardDescription>
              Games, editions, and expansions this miniature belongs to
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Link Game
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Link to Game</DialogTitle>
                <DialogDescription>
                  Select a game, edition, and expansion to link this miniature to.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <GameSelector
                  selectedGameId={selectedGameId}
                  selectedEditionId={selectedEditionId}
                  selectedExpansionId={selectedExpansionId}
                  onGameChange={setSelectedGameId}
                  onEditionChange={setSelectedEditionId}
                  onExpansionChange={setSelectedExpansionId}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleLink} disabled={isLoading || !selectedGameId}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Link Game
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {currentLinks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No games linked yet</p>
        ) : (
          <div className="space-y-3">
            {currentLinks.map((link) => (
              <div
                key={link.game_id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="font-medium">{link.games.name}</div>
                  {link.editions && (
                    <Badge variant="secondary" className="mr-2">
                      {link.editions.name}
                      {link.editions.year && ` (${link.editions.year})`}
                    </Badge>
                  )}
                  {link.expansions && (
                    <Badge variant="outline">
                      {link.expansions.name}
                      {link.expansions.year && ` (${link.expansions.year})`}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUnlink(link.game_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
