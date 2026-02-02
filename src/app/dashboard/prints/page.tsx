import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { PrintFormDialog } from "@/components/prints/print-form-dialog";
import { PrintCard } from "@/components/prints/print-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Print Queue | Hobby Tracker",
  description: "Manage your 3D print queue and history",
};

async function PrintsContent({ filter }: { filter?: string }) {
  const user = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("prints")
    .select("*, stl_files(id, name), miniatures(id, name), materials(id, name, type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: prints, error } = await query;

  if (error) {
    console.error("Error fetching prints:", error);
    return <div>Error loading prints</div>;
  }

  if (!prints || prints.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">🖨️</div>
          <h3 className="text-xl font-semibold mb-2">No Print Jobs Yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first print job to start tracking your 3D printing workflow.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {prints.map((print) => (
        <PrintCard key={print.id} print={print} />
      ))}
    </div>
  );
}

export default async function PrintsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireAuth();
  const { filter } = await searchParams;
  const supabase = await createClient();

  // Fetch data for the dialog
  const [{ data: stlFiles }, { data: materials }, { data: miniatures }] = await Promise.all([
    supabase.from("stl_files").select("id, name").eq("user_id", user.id).order("name"),
    supabase.from("materials").select("id, name, type").eq("user_id", user.id).order("name"),
    supabase.from("miniatures").select("id, name").eq("user_id", user.id).order("name"),
  ]);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Print Queue</h1>
          <p className="text-muted-foreground mt-2">Manage your 3D print jobs and history</p>
        </div>
        {stlFiles && materials && (
          <PrintFormDialog
            stlFiles={stlFiles}
            materials={materials}
            miniatures={miniatures || []}
          />
        )}
      </div>

      <Tabs defaultValue={filter || "all"}>
        <TabsList>
          <TabsTrigger value="all">All Prints</TabsTrigger>
          <TabsTrigger value="queued">Queued</TabsTrigger>
          <TabsTrigger value="printing">Printing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PrintsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="queued" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PrintsContent filter="queued" />
          </Suspense>
        </TabsContent>

        <TabsContent value="printing" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PrintsContent filter="printing" />
          </Suspense>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PrintsContent filter="completed" />
          </Suspense>
        </TabsContent>

        <TabsContent value="failed" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <PrintsContent filter="failed" />
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
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
