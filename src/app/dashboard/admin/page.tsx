import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, Tag, Gamepad2, BookOpen, Database, Shield, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    {
      title: "Faction Management",
      description: "Manage factions for your miniature collection",
      icon: Shield,
      href: "/dashboard/admin/factions",
      color: "text-blue-500",
    },
    {
      title: "Army Types",
      description: "Manage army types for faction categorization",
      icon: Shield,
      href: "/dashboard/admin/army-types",
      color: "text-cyan-500",
    },
    {
      title: "Miniature Import",
      description: "Bulk import miniatures from CSV file",
      icon: Upload,
      href: "/dashboard/admin/miniature-import",
      color: "text-indigo-500",
    },
    {
      title: "Database Management",
      description: "Backup and restore your database",
      icon: Database,
      href: "/dashboard/admin/database",
      color: "text-red-500",
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
    </div>
  );
}
