import { requireAuth } from "@/lib/auth/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { StatusManagement } from "@/components/admin/status-management";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StatusesAdminPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: statuses, error } = await supabase
    .from("miniature_statuses")
    .select("id, name, display_order, created_at")
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load statuses: ${error.message}`);
  }

  // Fetch usage counts of each status across miniature_status table
  let statusUsageRows: { status: string }[] | null = null;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createServiceRoleClient();
      const res = await adminClient.from("miniature_status").select("status");
      statusUsageRows = res.data;
    } else {
      const res = await supabase.from("miniature_status").select("status");
      statusUsageRows = res.data;
    }
  } catch (e) {
    console.warn("Could not fetch miniature_status usage counts:", e);
  }

  const usageCounts: Record<string, number> = {};
  if (statusUsageRows) {
    for (const row of statusUsageRows) {
      if (row.status) {
        usageCounts[row.status] = (usageCounts[row.status] || 0) + 1;
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage miniature workflow statuses, order, and reassignments
          </p>
        </div>
      </div>

      <StatusManagement statuses={statuses ?? []} usageCounts={usageCounts} />
    </div>
  );
}
