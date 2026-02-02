import { Suspense } from "react";
import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TagManager } from "@/components/miniatures/tag-manager";

async function TagsList() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch all tags
  const { data: tags, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!tags || tags.length === 0) {
    return (
      <div className="text-center py-12">
        <TagIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tags yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first tag to organize your miniatures
        </p>
        <div className="max-w-md mx-auto">
          <TagManager tags={[]} />
        </div>
      </div>
    );
  }

  // Get counts for all tags
  const tagIds = tags.map((t) => t.id);
  const { data: counts } = await supabase
    .from("miniature_tags")
    .select("tag_id")
    .in("tag_id", tagIds);

  // Count miniatures per tag
  const countMap = new Map<string, number>();
  counts?.forEach((c) => {
    countMap.set(c.tag_id, (countMap.get(c.tag_id) || 0) + 1);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tags.map((tag) => {
          const count = countMap.get(tag.id) || 0;

          return (
            <Link key={tag.id} href={`/dashboard/tags/${tag.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: tag.color || "#3b82f6" }}
                    >
                      <TagIcon className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">{tag.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {count} {count === 1 ? "miniature" : "miniatures"}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-2"
                    style={{
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.color || "#3b82f6"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TagsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function TagsPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground">Organize and categorize your miniatures</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Manage Tags</h2>
        <TagManager tags={tags || []} />
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">All Tags</h2>
        <Suspense fallback={<TagsLoading />}>
          <TagsList />
        </Suspense>
      </div>
    </div>
  );
}
