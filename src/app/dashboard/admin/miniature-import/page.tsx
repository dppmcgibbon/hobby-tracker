import { requireAuth } from "@/lib/auth/server";
import { MiniatureCSVImport } from "@/components/admin/miniature-csv-import";

export const dynamic = "force-dynamic";

export default async function MiniatureImportPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Miniature Import</h1>
        <p className="text-muted-foreground mt-2">
          Bulk import miniatures from CSV file
        </p>
      </div>

      <MiniatureCSVImport />
    </div>
  );
}
