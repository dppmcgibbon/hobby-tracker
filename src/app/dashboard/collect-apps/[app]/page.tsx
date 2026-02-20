import { requireAuth } from "@/lib/auth/server";
import {
  getCollectApps,
  getCollectConfigByApp,
  getCollectAppRows,
  getInitialSortKey,
} from "@/lib/queries/collect";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectDataTable } from "@/components/collect/collect-data-table";

export default async function CollectAppPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  await requireAuth();
  const { app } = await params;

  const [apps, config, rows, sortKey] = await Promise.all([
    getCollectApps(),
    getCollectConfigByApp(app).catch(() => null),
    getCollectAppRows(app).catch(() => null),
    getInitialSortKey(app).catch(() => null),
  ]);

  const appExists = apps.some((a) => a.app === app);
  if (!appExists || !config || !rows) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/collect-apps"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Collect Apps
        </Link>
      </div>

      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          {app}
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          {rows.length} items
        </p>
      </div>

      <CollectDataTable
        app={app}
        tableConfig={config}
        rows={rows}
        initialSortKey={sortKey ?? undefined}
      />
    </div>
  );
}
