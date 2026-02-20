import { requireAuth } from "@/lib/auth/server";
import { getCollectApps } from "@/lib/queries/collect";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Gamepad2, Music, Newspaper } from "lucide-react";

const appIcons: Record<string, React.ReactNode> = {
  boardgames: <Gamepad2 className="h-8 w-8" />,
  records: <Music className="h-8 w-8" />,
  stories: <BookOpen className="h-8 w-8" />,
  magazines: <Newspaper className="h-8 w-8" />,
};

export default async function CollectAppsPage() {
  await requireAuth();
  const apps = await getCollectApps();

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Collect Apps
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Browse your board games, records, stories, and magazines
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => (
          <Link key={app.id} href={`/dashboard/collect-apps/${app.app}`}>
            <Card className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/20 p-3 text-primary">
                    {appIcons[app.app] ?? <Gamepad2 className="h-8 w-8" />}
                  </div>
                  <CardTitle className="text-xl uppercase tracking-wide text-primary">
                    {app.app}
                  </CardTitle>
                </div>
                <CardDescription className="capitalize">
                  View and browse your {app.app} collection
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
