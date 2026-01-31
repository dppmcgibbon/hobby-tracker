import { requireAuth } from "@/lib/auth/server";
import { getMiniatures } from "@/lib/queries/miniatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle, Paintbrush, Plus, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();
  const miniatures = await getMiniatures(user.id);

  // Calculate statistics
  const totalMiniatures = miniatures.length;
  const completedCount = miniatures.filter((m) => m.status?.status === "completed").length;
  const inProgressCount = miniatures.filter((m) => m.status?.status === "painting").length;
  const backlogCount = miniatures.filter((m) => m.status?.status === "backlog").length;

  const completionPercentage =
    totalMiniatures > 0 ? Math.round((completedCount / totalMiniatures) * 100) : 0;

  // Group by faction
  const factionStats = miniatures.reduce(
    (acc, miniature) => {
      if (miniature.faction) {
        const factionName = miniature.faction.name;
        if (!acc[factionName]) {
          acc[factionName] = { total: 0, completed: 0 };
        }
        acc[factionName].total++;
        if (miniature.status?.status === "completed") {
          acc[factionName].completed++;
        }
      }
      return acc;
    },
    {} as Record<string, { total: number; completed: number }>
  );

  const topFactions = Object.entries(factionStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your collection</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collection/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Miniature
          </Link>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miniatures</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMiniatures}</div>
            <p className="text-xs text-muted-foreground">In your collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">{completionPercentage}% of collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Paintbrush className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently painting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlog</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backlogCount}</div>
            <p className="text-xs text-muted-foreground">Waiting to start</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Completion</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span>Backlog: {backlogCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>
                Assembled: {miniatures.filter((m) => m.status?.status === "assembled").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Primed: {miniatures.filter((m) => m.status?.status === "primed").length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Painting: {inProgressCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Done: {completedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Factions */}
      {topFactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection by Faction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFactions.map(([faction, stats]) => {
                const percentage = Math.round((stats.completed / stats.total) * 100);
                return (
                  <div key={faction} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{faction}</span>
                      <span className="text-muted-foreground">
                        {stats.completed}/{stats.total} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-auto py-6">
            <Link href="/dashboard/collection">
              <div className="flex flex-col items-center gap-2">
                <Package className="h-6 w-6" />
                <span>View Collection</span>
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-6">
            <Link href="/dashboard/recipes">
              <div className="flex flex-col items-center gap-2">
                <Paintbrush className="h-6 w-6" />
                <span>Paint Recipes</span>
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-6">
            <Link href="/dashboard/paints">
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Paint Inventory</span>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
