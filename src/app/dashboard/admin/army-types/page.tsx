import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ArmyTypeManagement } from "@/components/admin/army-type-management";

export const dynamic = "force-dynamic";

export default async function ArmyTypesPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: armyTypes } = await supabase
    .from("army_types")
    .select("*")
    .order("name");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Army Type Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage army types used for categorizing factions
        </p>
      </div>

      <ArmyTypeManagement armyTypes={armyTypes || []} />
    </div>
  );
}
