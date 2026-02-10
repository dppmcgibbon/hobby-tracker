import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { FactionManagement } from "@/components/admin/faction-management";

export const dynamic = "force-dynamic";

export default async function FactionsPage() {
  await requireAuth();
  const supabase = await createClient();

  const [{ data: factions }, { data: armyTypes }] = await Promise.all([
    supabase
      .from("factions")
      .select("*")
      .order("army_type")
      .order("name"),
    supabase
      .from("army_types")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Faction Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage factions for your miniature collection
        </p>
      </div>

      <FactionManagement factions={factions || []} armyTypes={armyTypes || []} />
    </div>
  );
}
