import { requireAuth } from "@/lib/auth/server";
import {
  getCollectionStatistics,
  getRecentActivity,
  getPaintStatistics,
} from "@/lib/queries/statistics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Palette, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { CompletionChart } from "@/components/dashboard/completion-chart";
import { FactionBreakdownChart } from "@/components/dashboard/faction-breakdown-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await requireAuth();
  const [stats, activity, paintStats] = await Promise.all([
    getCollectionStatistics(user.id),
    getRecentActivity(user.id),
    getPaintStatistics(user.id),
  ]);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>Start building your collection</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/collection/add">Add Your First Miniature</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s your collection overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miniatures</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMiniatures}</div>
            <p className="text-xs text-muted-foreground">{stats.uniqueModels} unique models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completionPercentage.toFixed(1)}% of collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.painting}</div>
            <p className="text-xs text-muted-foreground">Currently painting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paints</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paintStats.paintCount}</div>
            <p className="text-xs text-muted-foreground">In your inventory</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Progress</CardTitle>
          <CardDescription>Overall completion rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-medium">{stats.completionPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.completionPercentage} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Backlog</p>
              <p className="text-2xl font-bold">{stats.backlog}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Assembled</p>
              <p className="text-2xl font-bold">{stats.assembled}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Primed</p>
              <p className="text-2xl font-bold">{stats.primed}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Painting</p>
              <p className="text-2xl font-bold">{stats.painting}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatusDistributionChart data={stats.statusBreakdown} />
        <FactionBreakdownChart factionBreakdown={stats.factionBreakdown} />
      </div>

      <CompletionChart
        completionsByMonth={stats.completionsByMonth}
        additionsByMonth={stats.additionsByMonth}
      />

      {/* Recent Activity and Top Paints */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity
          recentMiniatures={activity.recentMiniatures}
          recentCompletions={activity.recentCompletions}
          recentPhotos={activity.recentPhotos}
        />

        {paintStats.mostUsedPaints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Most Used Paints</CardTitle>
              <CardDescription>From your painting recipes</CardDescription>
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
                      <div key={paint.name + index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: paint.color_hex || "#888" }}
                          />
                          <div>
                            <p className="text-sm font-medium">{paint.name}</p>
                            <p className="text-xs text-muted-foreground">{paint.brand}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{paint.count} uses</Badge>
                      </div>
                    )
                  )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
