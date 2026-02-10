import { requireAuth } from "@/lib/auth/server";
import {
  getCollectionStatistics,
  getPaintStatistics,
  getGameStatistics,
} from "@/lib/queries/statistics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle2, Clock } from "lucide-react";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { FactionBreakdownChart } from "@/components/dashboard/faction-breakdown-chart";
import { GameStatisticsCard } from "@/components/dashboard/game-statistics-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await requireAuth();
  const [stats, paintStats, gameStats] = await Promise.all([
    getCollectionStatistics(user.id),
    getPaintStatistics(user.id),
    getGameStatistics(user.id),
  ]);

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
            Dashboard
          </h1>
        </div>
        <Card className="warhammer-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl uppercase tracking-wide text-primary">
              For the Emperor!
            </CardTitle>
            <CardDescription className="text-base">
              Begin your conquest by marshalling your forces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="btn-warhammer-primary">
              <Link href="/dashboard/collection/add">Deploy First Unit</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-full">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Strategic overview of your forces and campaign progress
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">Total Forces</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{stats.totalMiniatures}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {stats.uniqueModels} unique units
            </p>
          </CardContent>
        </Card>

        <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">Battle Ready</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{stats.completed}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {stats.completionPercentage.toFixed(1)}% complete
            </p>
          </CardContent>
        </Card>

        <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">{stats.painting}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">On the workbench</p>
          </CardContent>
        </Card>

        <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">Backlog</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-muted-foreground">{stats.backlog}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Awaiting deployment</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatusDistributionChart data={stats.statusBreakdown} />
        <FactionBreakdownChart factionBreakdown={stats.factionBreakdown} />
      </div>

      {/* Top Paints */}
      {paintStats.mostUsedPaints.length > 0 && (
        <Card className="warhammer-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl uppercase tracking-wide text-primary">
              Most Used Paints
            </CardTitle>
            <CardDescription>Your most deployed colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paintStats.mostUsedPaints
                .slice(0, 10)
                .map(
                  (
                    paint: { name: string; brand: string; color_hex?: string; count: number },
                    index: number
                  ) => (
                    <div
                      key={paint.name + index}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/30 transition-colors border border-transparent hover:border-primary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-sm border-2 border-primary/30 shadow-inner"
                          style={{ backgroundColor: paint.color_hex || "#888" }}
                        />
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide">{paint.name}</p>
                          <p className="text-xs text-muted-foreground">{paint.brand}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary font-bold uppercase tracking-wide"
                      >
                        {paint.count} uses
                      </Badge>
                    </div>
                  )
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Statistics */}
      {gameStats.gameBreakdown.length > 0 && (
        <GameStatisticsCard
          gameBreakdown={gameStats.gameBreakdown}
          totalGames={gameStats.totalGames}
          totalLinkedMiniatures={gameStats.totalLinkedMiniatures}
        />
      )}
    </div>
  );
}
