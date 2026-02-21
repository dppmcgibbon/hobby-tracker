import { requireAuth } from "@/lib/auth/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ChevronRight } from "lucide-react";

const GAMES = [
  {
    slug: "bsf",
    name: "Blackstone Fortress",
    description: "Warhammer Quest: Blackstone Fortress – rules, current game, and reference",
  },
] as const;

export default async function GameProgressPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8" />
          Game progress
        </h1>
        <p className="text-muted-foreground mt-1">
          Rules, setup, and session tracking for your board games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Link key={game.slug} href={`/dashboard/game-progress/${game.slug}`}>
            <Card className="warhammer-card border-primary/30 hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <h2 className="font-bold text-lg uppercase tracking-wide text-primary flex items-center gap-2">
                  {game.name}
                  <ChevronRight className="h-5 w-5" />
                </h2>
                <p className="text-muted-foreground mt-2 text-sm flex-1">
                  {game.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
