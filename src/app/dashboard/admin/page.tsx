import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, Tag, Gamepad2, Settings, BookOpen, Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatabaseBackupButton } from "@/components/dashboard/database-backup-button";

export default async function AdminPage() {
  await requireAuth();

  const adminSections = [
    {
      title: "Games Management",
      description: "Manage game systems, editions, and expansions",
      icon: Gamepad2,
      href: "/dashboard/games",
      color: "text-blue-500",
    },
    {
      title: "Recipes Management",
      description: "Create and manage painting recipes for your miniatures",
      icon: BookOpen,
      href: "/dashboard/recipes",
      color: "text-orange-500",
    },
    {
      title: "Tags Management",
      description: "Create and organize tags for your collection",
      icon: Tag,
      href: "/dashboard/tags",
      color: "text-green-500",
    },
    {
      title: "Storage Management",
      description: "Manage storage boxes and organization",
      icon: Archive,
      href: "/dashboard/storage",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-8 max-w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
            Admin Center
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Manage your system configuration and organizational tools
          </p>
        </div>
        <DatabaseBackupButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <CardTitle className="text-xl uppercase tracking-wide">
                    {section.title}
                  </CardTitle>
                </div>
                <CardDescription className="text-base">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href={section.href}>
                    Open {section.title.replace(" Management", "")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Admin Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Gamepad2 className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <p className="font-semibold">Games</p>
                <p className="text-muted-foreground">
                  Organize your miniatures by game system, edition, and expansion
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 mt-0.5 text-orange-500" />
              <div>
                <p className="font-semibold">Recipes</p>
                <p className="text-muted-foreground">
                  Create step-by-step painting guides and link them to your miniatures
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Tag className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <p className="font-semibold">Tags</p>
                <p className="text-muted-foreground">
                  Create custom tags to categorize and filter your collection
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Archive className="h-4 w-4 mt-0.5 text-purple-500" />
              <div>
                <p className="font-semibold">Storage</p>
                <p className="text-muted-foreground">
                  Track where your miniatures are stored for easy retrieval
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
