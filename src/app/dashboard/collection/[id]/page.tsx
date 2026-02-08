import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getMiniatureById } from "@/lib/queries/miniatures";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoUpload } from "@/components/miniatures/photo-upload";
import { PhotoGallery } from "@/components/miniatures/photo-gallery";
import { DeleteMiniatureButton } from "@/components/miniatures/delete-miniature-button";
import { DuplicateMiniatureButton } from "@/components/miniatures/duplicate-miniature-button";
import { StatusBadge } from "@/components/miniatures/status-badge";
import { TagManager } from "@/components/miniatures/tag-manager";
import { ArrowLeft, Edit, Calendar } from "lucide-react";
import { getRecipes } from "@/lib/queries/recipes";
import { LinkRecipeDialog } from "@/components/recipes/link-recipe-dialog";
import { unlinkRecipeFromMiniature } from "@/app/actions/recipes";
import { BookOpen, X } from "lucide-react";
import { GameLinkManager } from "@/components/games/game-link-manager";
import { BackToMiniaturesButton } from "@/components/miniatures/back-to-miniatures-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const [miniature, recipes] = await Promise.all([
    getMiniatureById(id, user.id),
    getRecipes(user.id),
  ]);

  // Get the linked recipes, tags, and games
  const supabase = await createClient();
  const [
    { data: miniatureRecipes },
    { data: allTags },
    { data: miniatureTags },
    { data: miniatureGames },
  ] = await Promise.all([
    supabase.from("miniature_recipes").select("recipe_id").eq("miniature_id", id),
    supabase.from("tags").select("id, name, color").eq("user_id", user.id).order("name"),
    supabase.from("miniature_tags").select("tag_id, tags(id, name, color)").eq("miniature_id", id),
    supabase
      .from("miniature_games")
      .select(
        `
        game_id,
        edition_id,
        expansion_id,
        games(id, name, publisher),
        editions:edition_id(id, name, year),
        expansions:expansion_id(id, name, year)
      `
      )
      .eq("miniature_id", id),
  ]);

  const linkedRecipeIds = miniatureRecipes?.map((mr) => mr.recipe_id) || [];
  const linkedRecipes = recipes.filter((r) => linkedRecipeIds.includes(r.id));

  // Get selected tag IDs
  const selectedTagIds = miniatureTags?.map((mt) => mt.tag_id) || [];

  // Count linked recipes from miniature data
  const linkedRecipeCount = miniature.recipes?.length || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BackToMiniaturesButton />
        <div className="flex gap-2">
          <DuplicateMiniatureButton miniatureId={id} />
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

              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <TagManager tags={allTags || []} miniatureId={id} selectedTags={selectedTagIds} />
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

                {(miniature as any).storage_box && (
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Location</p>
                    <Link
                      href={`/dashboard/storage/${(miniature as any).storage_box.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {(miniature as any).storage_box.name}
                      {(miniature as any).storage_box.location &&
                        ` (${(miniature as any).storage_box.location})`}
                    </Link>
                  </div>
                )}

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

          {/* Game Links */}
          <GameLinkManager miniatureId={id} currentLinks={miniatureGames || []} />
        </div>

        {/* Right Column - Photos & Recipes */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="photos" className="space-y-6">
            <TabsList>
              <TabsTrigger value="photos">Photos ({miniature.photos?.length || 0})</TabsTrigger>
              <TabsTrigger value="recipes">Recipes ({linkedRecipeCount})</TabsTrigger>
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
                  <PhotoGallery photos={miniature.photos || []} miniatureName={miniature.name} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recipes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Linked Recipes ({linkedRecipes.length})
                    </CardTitle>
                    <LinkRecipeDialog
                      miniatureId={id}
                      recipes={recipes}
                      linkedRecipeIds={linkedRecipeIds}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {linkedRecipes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recipes linked to this miniature yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {linkedRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <Link
                                href={`/dashboard/recipes/${recipe.id}`}
                                className="font-semibold hover:underline"
                              >
                                {recipe.name}
                              </Link>
                              {recipe.faction && (
                                <p className="text-sm text-muted-foreground">
                                  {recipe.faction.name}
                                </p>
                              )}
                            </div>
                            <form
                              action={async () => {
                                "use server";
                                await unlinkRecipeFromMiniature(id, recipe.id);
                              }}
                            >
                              <Button variant="ghost" size="icon" type="submit">
                                <X className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                          <Badge variant="outline">{recipe.steps?.length || 0} steps</Badge>
                        </div>
                      ))}
                    </div>
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
