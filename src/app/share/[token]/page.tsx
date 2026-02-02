import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/miniatures/photo-gallery";
import { StatusBadge } from "@/components/miniatures/status-badge";

interface Props {
  params: { token: string };
}

interface RecipeStep {
  id: string;
  step_order: number;
  technique: string;
  notes?: string;
  paints?: {
    name: string;
    brand: string;
    color_hex: string;
  };
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  recipe_steps?: RecipeStep[];
}

interface MiniatureData {
  id: string;
  name: string;
  factions?: { name: string };
  photos?: Array<{ id: string; storage_path: string; caption?: string; photo_type?: string }>;
  recipes?: Recipe[];
  miniature_status?: {
    status: string;
    completed_at?: string | null;
    based?: boolean | null;
    magnetised?: boolean | null;
  };
}

export default async function SharedMiniaturePage({ params }: Props) {
  const supabase = await createClient();

  // Fetch shared miniature
  const { data: share, error } = await supabase
    .from("shared_miniatures")
    .select(
      `
      *,
      miniatures (
        *,
        factions (name),
        photos (id, storage_path, caption, photo_type),
        recipes (
          id,
          name,
          description,
          recipe_steps (
            id,
            step_order,
            technique,
            notes,
            paints (name, brand, color_hex)
          )
        )
      )
    `
    )
    .eq("share_token", params.token)
    .eq("is_public", true)
    .single();

  if (error || !share || !share.miniatures) {
    notFound();
  }

  // Increment view count (fire and forget)
  supabase
    .from("shared_miniatures")
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq("id", share.id)
    .then(() => {});

  const miniature = share.miniatures as MiniatureData;
  const photos = miniature.photos || [];
  const recipes = miniature.recipes || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{miniature.name}</h1>
          {miniature.factions && (
            <p className="text-xl text-muted-foreground">{miniature.factions.name}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4">
            {miniature.status && <StatusBadge status={miniature.status} />}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{share.view_count || 0} views</span>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="mb-12">
            <PhotoGallery photos={photos} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {miniature.unit_type && (
                <div>
                  <span className="text-sm font-medium">Unit Type:</span>
                  <span className="ml-2 text-sm text-muted-foreground">{miniature.unit_type}</span>
                </div>
              )}
              {miniature.quantity && (
                <div>
                  <span className="text-sm font-medium">Quantity:</span>
                  <span className="ml-2 text-sm text-muted-foreground">{miniature.quantity}</span>
                </div>
              )}
              {miniature.sculptor && (
                <div>
                  <span className="text-sm font-medium">Sculptor:</span>
                  <span className="ml-2 text-sm text-muted-foreground">{miniature.sculptor}</span>
                </div>
              )}
              {miniature.year && (
                <div>
                  <span className="text-sm font-medium">Year:</span>
                  <span className="ml-2 text-sm text-muted-foreground">{miniature.year}</span>
                </div>
              )}
              {miniature.magnetised && (
                <div>
                  <Badge variant="secondary">Magnetised</Badge>
                </div>
              )}
              {miniature.based && (
                <div>
                  <Badge variant="secondary">Based</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipes */}
          {recipes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Painting Recipe</CardTitle>
                <CardDescription>{recipes[0].name}</CardDescription>
              </CardHeader>
              <CardContent>
                {recipes[0].description && <p className="text-sm mb-4">{recipes[0].description}</p>}
                <div className="space-y-2">
                  {recipes[0].recipe_steps
                    ?.sort((a, b) => a.step_order - b.step_order)
                    .map((step, idx) => (
                      <div key={step.id} className="flex gap-3 p-3 rounded-lg border">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{step.technique}</span>
                            {step.paints && (
                              <Badge variant="outline" className="text-xs">
                                {step.paints.brand} {step.paints.name}
                              </Badge>
                            )}
                          </div>
                          {step.notes && (
                            <p className="text-sm text-muted-foreground">{step.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="text-center py-8">
            <h3 className="text-2xl font-bold mb-2">Want to track your own miniatures?</h3>
            <p className="text-muted-foreground mb-6">
              Create your collection, track your progress, and share with the community
            </p>
            <Link href="/auth/signup">
              <Button size="lg">
                Get Started Free
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
