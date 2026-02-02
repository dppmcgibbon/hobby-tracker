import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Package, CheckCircle2, Camera, Calendar } from "lucide-react";

interface RecentMiniature {
  id: string;
  name: string;
  created_at: string;
  factions?: { name: string } | { name: string }[] | null;
}

interface RecentCompletion {
  miniature_id: string;
  completed_at: string;
  miniatures: { name: string } | { name: string }[] | null;
}

interface RecentPhoto {
  uploaded_at: string;
  miniatures: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface RecentActivityProps {
  recentMiniatures: RecentMiniature[];
  recentCompletions: RecentCompletion[];
  recentPhotos: RecentPhoto[];
}

export function RecentActivity({
  recentMiniatures,
  recentCompletions,
  recentPhotos,
}: RecentActivityProps) {
  const activities = [
    ...recentMiniatures.map((m) => {
      const factions = Array.isArray(m.factions) ? m.factions[0] : m.factions;
      return {
        type: "added" as const,
        id: m.id,
        name: m.name,
        faction: factions?.name,
        date: new Date(m.created_at),
        link: `/dashboard/collection/${m.id}`,
      };
    }),
    ...recentCompletions.map((c) => {
      const miniatures = Array.isArray(c.miniatures) ? c.miniatures[0] : c.miniatures;
      return {
        type: "completed" as const,
        id: c.miniature_id,
        name: miniatures?.name,
        faction: undefined,
        date: new Date(c.completed_at),
        link: `/dashboard/collection/${c.miniature_id}`,
      };
    }),
    ...recentPhotos.map((p) => {
      const miniatures = Array.isArray(p.miniatures) ? p.miniatures[0] : p.miniatures;
      return {
        type: "photo" as const,
        id: miniatures?.id,
        name: miniatures?.name,
        faction: undefined,
        date: new Date(p.uploaded_at),
        link: `/dashboard/collection/${miniatures?.id}`,
      };
    }),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const icons = {
    added: Package,
    completed: CheckCircle2,
    photo: Camera,
  };

  const labels = {
    added: "Added",
    completed: "Completed",
    photo: "Photo uploaded",
  };

  const colors = {
    added: "bg-primary",
    completed: "bg-accent",
    photo: "bg-secondary",
  };

  if (activities.length === 0) {
    return (
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest force deployments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground uppercase text-sm tracking-wide">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl uppercase tracking-wide text-primary">
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest force deployments</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const Icon = icons[activity.type as keyof typeof icons];
              return (
                <Link
                  key={`${activity.type}-${activity.id}-${index}`}
                  href={activity.link}
                  className="flex items-start gap-3 p-3 rounded-sm hover:bg-muted/30 transition-all border border-transparent hover:border-primary/30"
                >
                  <div
                    className={`${colors[activity.type as keyof typeof colors]} rounded-sm p-2 shadow-md`}
                  >
                    <Icon className="h-4 w-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-clamp-1 uppercase tracking-wide">
                      {activity.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="text-xs border-primary/30 text-primary font-semibold uppercase tracking-wide"
                      >
                        {labels[activity.type as keyof typeof labels]}
                      </Badge>
                      {activity.faction && (
                        <span className="text-xs text-muted-foreground">{activity.faction}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                    <Calendar className="h-3 w-3" />
                    {activity.date.toLocaleDateString()}
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
