import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectAppsConfig } from "@/components/admin/collect-apps-config";

export const dynamic = "force-dynamic";

export default async function CollectAppsAdminPage() {
  await requireAuth();
  const supabase = await createClient();

  const [{ data: apps }, { data: config }] = await Promise.all([
    supabase.from("collect_apps").select("*").order("app", { ascending: true }),
    supabase.from("collect_config").select("*").order("sequence", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>
      </div>

      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Collect Apps Config
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Manage collect apps and table column configuration
        </p>
      </div>

      <CollectAppsConfig apps={apps || []} config={config || []} />
    </div>
  );
}
