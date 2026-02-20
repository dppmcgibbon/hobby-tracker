import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { PaintManagement } from "@/components/admin/paint-management";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaintsAdminPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: paints, error } = await supabase
    .from("paints")
    .select("id, brand, name, type, color_hex, created_at")
    .order("brand", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
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
          <h1 className="text-3xl font-bold tracking-tight">Paint management</h1>
          <p className="text-muted-foreground mt-1">
            Add paints, update hex codes, and manage brands
          </p>
        </div>
      </div>

      <PaintManagement paints={paints ?? []} />
    </div>
  );
}
