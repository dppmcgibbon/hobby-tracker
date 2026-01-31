import { requireAuth } from "@/lib/auth/server";

export default async function PaintsPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Paint Inventory</h1>
      <p className="text-muted-foreground">Manage your paint collection here.</p>
    </div>
  );
}