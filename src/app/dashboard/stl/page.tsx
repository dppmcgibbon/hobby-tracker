import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { StlUploadDialog } from "@/components/stl/stl-upload-dialog";
import { StlCard } from "@/components/stl/stl-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "STL Library | Hobby Tracker",
  description: "Manage your 3D model STL files",
};

async function StlLibraryContent({
  searchQuery,
  filter,
}: {
  searchQuery?: string;
  filter?: string;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("stl_files")
    .select(
      `
      *,
      stl_tags(
        tag_id,
        tags(id, name, color)
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,designer.ilike.%${searchQuery}%,source.ilike.%${searchQuery}%`
    );
  }

  if (filter === "supported") {
    query = query.eq("is_supported", true);
  } else if (filter === "unsupported") {
    query = query.eq("is_supported", false);
  }

  const { data: stlFiles, error } = await query;

  if (error) {
    console.error("Error fetching STL files:", error);
    return <div>Error loading STL files</div>;
  }

  if (!stlFiles || stlFiles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No STL Files Yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Upload your first 3D model file to get started with print tracking and management.
          </p>
          <StlUploadDialog />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {stlFiles.map((stl) => (
        <StlCard key={stl.id} stlFile={stl} tags={stl.stl_tags} />
      ))}
    </div>
  );
}

export default async function StlLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>;
}) {
  await requireAuth();
  const { search, filter } = await searchParams;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">STL Library</h1>
          <p className="text-muted-foreground mt-2">Manage your 3D model files</p>
        </div>
        <StlUploadDialog />
      </div>

      <div className="flex gap-4">
        <Input
          type="search"
          placeholder="Search STL files..."
          className="max-w-sm"
          defaultValue={search}
          name="search"
        />
      </div>

      <Tabs defaultValue={filter || "all"}>
        <TabsList>
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="supported">Supported</TabsTrigger>
          <TabsTrigger value="unsupported">Needs Support</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <StlLibraryContent searchQuery={search} />
          </Suspense>
        </TabsContent>

        <TabsContent value="supported" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <StlLibraryContent searchQuery={search} filter="supported" />
          </Suspense>
        </TabsContent>

        <TabsContent value="unsupported" className="mt-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <StlLibraryContent searchQuery={search} filter="unsupported" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <Card key={i}>
          <Skeleton className="aspect-square" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
