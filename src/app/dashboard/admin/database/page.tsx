import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { DatabaseBackupButton } from "@/components/dashboard/database-backup-button";
import { DatabaseImportButton } from "@/components/dashboard/database-import-button";

export const dynamic = "force-dynamic";

export default async function DatabaseManagementPage() {
  await requireAuth();

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
