import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Globe, ImagePlus } from "lucide-react";
import { DatabaseBackupButton } from "@/components/dashboard/database-backup-button";
import { DatabaseImportButton } from "@/components/dashboard/database-import-button";
import { ImportPhotosOnlyButton } from "@/components/dashboard/import-photos-only-button";
import { UniverseBackupSection } from "@/components/dashboard/universe-backup-section";

export const dynamic = "force-dynamic";
/** Allow backup server action to run up to 5 minutes (avoids production timeout). */
export const maxDuration = 300;

export default async function DatabaseManagementPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: universes } = await supabase.from("universes").select("id, name").order("name");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
        <p className="text-muted-foreground mt-2">
          Backup and manage your database
        </p>
      </div>

      <Card className="warhammer-card border-primary/30">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-sm border border-primary/20">
              <Database className="h-5 w-5 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="font-semibold text-sm uppercase tracking-wide mb-1">Backup Database</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Download CSV exports for all backed-up tables (including miniature_photos metadata such as storage
                  paths). Image files in storage are not included—use Universe photos or Import photos only for those.
                </p>
                <DatabaseBackupButton />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-sm border border-primary/20">
              <Globe className="h-5 w-5 mt-0.5 text-sky-500" />
              <div className="flex-1">
                <p className="font-semibold text-sm uppercase tracking-wide mb-1">Universe photos</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Download images from storage for miniatures linked to games in that universe (via game
                  assignments). No database tables are included. Files are placed under photos/ using the same path as
                  in the miniature-photos bucket.
                </p>
                <UniverseBackupSection universes={universes ?? []} />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-sm border border-primary/20">
              <ImagePlus className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-sm uppercase tracking-wide mb-1">Import photos only</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a backup ZIP from the app&apos;s export. Only the photos are extracted and uploaded to storage;
                  no database rows are imported or changed.
                </p>
                <ImportPhotosOnlyButton />
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
