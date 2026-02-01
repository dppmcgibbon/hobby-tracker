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
    added: "bg-blue-500",
    completed: "bg-green-500",
    photo: "bg-purple-500",
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest collection updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No recent activity</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest collection updates</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = icons[activity.type as keyof typeof icons];
              return (
                <Link
                  key={`${activity.type}-${activity.id}-${index}`}
                  href={activity.link}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div
                    className={`${colors[activity.type as keyof typeof colors]} rounded-full p-2`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{activity.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {labels[activity.type as keyof typeof labels]}
                      </Badge>
                      {activity.faction && (
                        <span className="text-xs text-muted-foreground">{activity.faction}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
