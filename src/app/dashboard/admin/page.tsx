import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, Tag, Gamepad2, BookOpen, Database, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatabaseBackupButton } from "@/components/dashboard/database-backup-button";
import { DatabaseImportButton } from "@/components/dashboard/database-import-button";
import { FactionManagement } from "@/components/admin/faction-management";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  await requireAuth();
  const supabase = await createClient();

  // Fetch all factions
  const { data: factions } = await supabase
    .from("factions")
    .select("*")
    .order("army_type")
    .order("name");

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
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Admin Center
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Manage your system configuration and organizational tools
        </p>
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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl uppercase tracking-wide text-primary">
                Faction Management
              </CardTitle>
              <CardDescription className="text-base">
                Manage factions for your miniature collection
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FactionManagement factions={factions || []} />
        </CardContent>
      </Card>

      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
              <Database className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-xl uppercase tracking-wide text-primary">
                Database Management
              </CardTitle>
              <CardDescription className="text-base">
                Backup and manage your database
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-sm border border-primary/20">
              <Database className="h-5 w-5 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="font-semibold text-sm uppercase tracking-wide mb-1">Backup Database</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a complete backup of your collection data including miniatures, recipes, and all metadata
                </p>
                <DatabaseBackupButton />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-sm border border-destructive/20">
              <Database className="h-5 w-5 mt-0.5 text-destructive" />
              <div className="flex-1">
                <p className="font-semibold text-sm uppercase tracking-wide mb-1 text-destructive">
                  Import Database
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  <span className="font-semibold text-destructive">Warning:</span> This will permanently replace all
                  your current data with the backup file. Make sure you have a current backup before importing.
                </p>
                <DatabaseImportButton />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
