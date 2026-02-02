import { Suspense } from "react";
import Link from "next/link";
import { Plus, Folder } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionCreateDialog } from "@/components/collections/collection-create-dialog";

async function CollectionsList() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first collection to organize your miniatures
        </p>
        <CollectionCreateDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </CollectionCreateDialog>
      </div>
    );
  }

  // Get counts for all collections
  const collectionIds = collections.map((c) => c.id);
  const { data: counts } = await supabase
    .from("collection_miniatures")
    .select("collection_id")
    .in("collection_id", collectionIds);

  // Count miniatures per collection
  const countMap = new Map<string, number>();
  counts?.forEach((c) => {
    countMap.set(c.collection_id, (countMap.get(c.collection_id) || 0) + 1);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => {
        const miniatureCount = countMap.get(collection.id) || 0;

        return (
          <Link key={collection.id} href={`/dashboard/collections/${collection.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: collection.color || "#3b82f6" }}
                      />
                      {collection.name}
                    </CardTitle>
                    {collection.description && (
                      <CardDescription className="mt-2">{collection.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {miniatureCount} {miniatureCount === 1 ? "miniature" : "miniatures"}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function CollectionsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground mt-2">
            Organize your miniatures into custom collections
          </p>
        </div>
        <CollectionCreateDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </Button>
        </CollectionCreateDialog>
      </div>

      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsList />
      </Suspense>
    </div>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
