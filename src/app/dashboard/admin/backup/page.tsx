import { requireAuth } from "@/lib/auth/server";
import { getAdminBackupStats } from "@/app/actions/admin-backup";
import { BackupManagement } from "@/components/admin/backup-management";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function AdminBackupPage() {
  await requireAuth();
  const stats = await getAdminBackupStats();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
          <p className="text-muted-foreground mt-1">
            Export full table data CSVs and download R2 cloud storage assets (miniature photos,
            PDFs, and game images)
          </p>
        </div>
      </div>

      <BackupManagement initialStats={stats} />
    </div>
  );
}
