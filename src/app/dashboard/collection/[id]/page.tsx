import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getMiniatureById } from "@/lib/queries/miniatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoUpload } from "@/components/miniatures/photo-upload";
import { PhotoGallery } from "@/components/miniatures/photo-gallery";
import { DeleteMiniatureButton } from "@/components/miniatures/delete-miniature-button";
import { StatusBadge } from "@/components/miniatures/status-badge";
import { ArrowLeft, Edit, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  let miniature;
  try {
    miniature = await getMiniatureById(id, user.id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/collection">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/collection/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteMiniatureButton miniatureId={id} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{miniature.name}</CardTitle>
              {miniature.faction && (
                <p className="text-muted-foreground">{miniature.faction.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <StatusBadge miniatureId={id} status={miniature.status} />
              </div>

              <Separator />

              <div className="space-y-3">
                {miniature.unit_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Type</p>
                    <p className="font-medium">{miniature.unit_type}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{miniature.quantity}</p>
                </div>

                {miniature.base_size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Base Size</p>
                    <p className="font-medium">{miniature.base_size}</p>
                  </div>
                )}

                {miniature.material && (
                  <div>
                    <p className="text-sm text-muted-foreground">Material</p>
                    <p className="font-medium">{miniature.material}</p>
                  </div>
                )}

                {miniature.sculptor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sculptor</p>
                    <p className="font-medium">{miniature.sculptor}</p>
                  </div>
                )}

                {miniature.year && (
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium">{miniature.year}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Added</span>
                  <span>{new Date(miniature.created_at).toLocaleDateString()}</span>
                </div>
                {miniature.status?.magnetised && <Badge variant="outline">Magnetised</Badge>}
                {miniature.status?.based && <Badge variant="outline">Based</Badge>}
              </div>

              {miniature.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {miniature.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Photos & Recipes */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="photos" className="space-y-6">
            <TabsList>
              <TabsTrigger value="photos">Photos ({miniature.photos?.length || 0})</TabsTrigger>
              <TabsTrigger value="recipes">Recipes ({miniature.recipes?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoUpload miniatureId={id} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Photo Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoGallery photos={miniature.photos || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recipes">
              <Card>
                <CardHeader>
                  <CardTitle>Painting Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                  {miniature.recipes?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recipes attached yet.</p>
                      <Button asChild className="mt-4">
                        <Link href="/dashboard/recipes">Browse Recipes</Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Recipe display coming in Phase 4</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
