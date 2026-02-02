import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialCard } from "@/components/materials/material-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Materials Inventory | Hobby Tracker",
  description: "Manage your 3D printing materials",
};

async function MaterialsContent({ filter }: { filter?: string }) {
  const user = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (filter && filter !== "all") {
    query = query.eq("type", filter);
  }

  const { data: materials, error } = await query;

  if (error) {
    console.error("Error fetching materials:", error);
    return <div>Error loading materials</div>;
  }

  if (!materials || materials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-xl font-semibold mb-2">No Materials Yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Add your first material to track your resin, filament, or powder inventory.
          </p>
          <MaterialFormDialog />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {materials.map((material) => (
        <MaterialCard key={material.id} material={material} />
      ))}
    </div>
  );
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAuth();
  const { filter } = await searchParams;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Materials Inventory</h1>
          <p className="text-muted-foreground mt-2">Track your 3D printing materials</p>
        </div>
        <MaterialFormDialog />
      </div>

      <Tabs defaultValue={filter || "all"}>
        <TabsList>
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="resin">Resin</TabsTrigger>
          <TabsTrigger value="filament">Filament</TabsTrigger>
          <TabsTrigger value="powder">Powder</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <MaterialsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="resin" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <MaterialsContent filter="resin" />
          </Suspense>
        </TabsContent>

        <TabsContent value="filament" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <MaterialsContent filter="filament" />
          </Suspense>
        </TabsContent>

        <TabsContent value="powder" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <MaterialsContent filter="powder" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
