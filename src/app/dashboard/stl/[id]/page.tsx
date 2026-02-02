import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { StlViewerComponent } from "@/components/stl/stl-viewer";
import { StlTagManager } from "@/components/stl/stl-tag-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Edit, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "STL File Details | Hobby Tracker",
};

async function StlDetailsContent({ id }: { id: string }) {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: stlFile, error } = await supabase
    .from("stl_files")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !stlFile) {
    notFound();
  }

  // Get related prints
  const { data: prints } = await supabase
    .from("prints")
    .select("*, miniatures(id, name), materials(id, name, type)")
    .eq("stl_file_id", id)
    .order("created_at", { ascending: false });

  // Get tags
  const { data: stlTags } = await supabase
    .from("stl_tags")
    .select("tag_id, tags(id, name, color)")
    .eq("stl_file_id", id);

  // Get all available tags for the tag manager
  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name");

  const fileSizeMB = stlFile.file_size_bytes
    ? (stlFile.file_size_bytes / 1024 / 1024).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/stl">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{stlFile.name}</h1>
            {stlFile.designer && <p className="text-muted-foreground">by {stlFile.designer}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/stl/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>3D Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <StlViewerComponent storagePath={stlFile.storage_path} height={500} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stlFile.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{stlFile.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {stlFile.source && (
                  <div>
                    <span className="font-medium">Source:</span>
                    <p className="text-muted-foreground">{stlFile.source}</p>
                  </div>
                )}

                {fileSizeMB && (
                  <div>
                    <span className="font-medium">File Size:</span>
                    <p className="text-muted-foreground">{fileSizeMB} MB</p>
                  </div>
                )}

                {stlFile.scale_factor && stlFile.scale_factor !== 1 && (
                  <div>
                    <span className="font-medium">Scale:</span>
                    <p className="text-muted-foreground">{stlFile.scale_factor}x</p>
                  </div>
                )}

                {stlFile.license && (
                  <div>
                    <span className="font-medium">License:</span>
                    <p className="text-muted-foreground">{stlFile.license}</p>
                  </div>
                )}
              </div>

              {stlFile.is_supported && <Badge variant="secondary">Pre-Supported</Badge>}

              {stlFile.source_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={stlFile.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Source
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Display existing tags */}
          {stlTags && stlTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stlTags.map((tag: { tag_id: string; tags: { name: string; color: string } }) => (
                    <Badge key={tag.tag_id} style={{ backgroundColor: tag.tags.color }}>
                      {tag.tags.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tag Manager */}
          {allTags && (
            <Card>
              <CardContent className="pt-6">
                <StlTagManager
                  stlFileId={stlFile.id}
                  currentTags={stlTags || []}
                  availableTags={allTags}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {prints && prints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Print History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prints.map(
                (print: {
                  id: string;
                  miniatures?: { name?: string };
                  materials?: { name?: string };
                  quantity: number;
                  status: string;
                }) => (
                  <div
                    key={print.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{print.miniatures?.name || "Print Job"}</p>
                      <p className="text-sm text-muted-foreground">
                        {print.materials?.name} • {print.quantity} copies • {print.status}
                      </p>
                    </div>
                    <Badge>{print.status}</Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function StlDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<LoadingSkeleton />}>
        <StlDetailsContent id={id} />
      </Suspense>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[500px] w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
