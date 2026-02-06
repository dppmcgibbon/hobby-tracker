"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";

interface GameBreakdown {
  id: string;
  name: string;
  count: number;
  editionCount: number;
}

interface GameStatisticsProps {
  gameBreakdown: GameBreakdown[];
  totalGames: number;
  totalLinkedMiniatures: number;
}

export function GameStatisticsCard({ gameBreakdown, totalGames, totalLinkedMiniatures }: GameStatisticsProps) {
  if (gameBreakdown.length === 0) {
    return null;
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Games Collection
        </CardTitle>
        <CardDescription>
          {totalGames} game{totalGames !== 1 ? "s" : ""} • {totalLinkedMiniatures} miniatures linked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gameBreakdown.map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between p-3 rounded border border-primary/20 hover:bg-muted/30 transition-colors hover:border-primary/40"
            >
              <div className="flex-1">
                <p className="text-sm font-bold uppercase tracking-wide">{game.name}</p>
                {game.editionCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {game.editionCount} edition{game.editionCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-bold uppercase tracking-wide"
              >
                {game.count} {game.count === 1 ? "mini" : "minis"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
