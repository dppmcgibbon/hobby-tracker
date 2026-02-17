import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Edit, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { StorageBoxCompleteToggle } from "@/components/storage/storage-box-complete-toggle";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StorageBoxDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch storage box
  const { data: storageBox, error: boxError } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (boxError || !storageBox) {
    notFound();
  }

  // Fetch miniatures in this storage box
  const { data: miniatures } = await supabase
    .from("miniatures")
    .select(
      `
      id,
      name,
      quantity,
      factions (name),
      miniature_status (status)
    `
    )
    .eq("storage_box_id", id)
    .eq("user_id", user.id)
    .order("name");

  const miniatureCount = miniatures?.length || 0;
  const totalQuantity =
    miniatures?.reduce((sum, m) => sum + (m.quantity || 1), 0) || 0;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/storage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Storage
          </Link>
        </Button>
      </div>

      {/* Storage Box Info */}
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
                <Archive className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl uppercase tracking-wider text-primary">
                    {storageBox.name}
                  </CardTitle>
                  <StorageBoxCompleteToggle
                    storageBoxId={id}
                    completed={storageBox.completed || false}
                    variant="badge"
                  />
                </div>
                {storageBox.location && (
                  <p className="text-muted-foreground mt-1">
                    Location: {storageBox.location}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/storage/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
          {storageBox.description && (
            <CardDescription className="text-base mt-4">
              {storageBox.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Unique Models
              </p>
              <p className="text-2xl font-black text-primary">{miniatureCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Miniatures
              </p>
              <p className="text-2xl font-black text-primary">{totalQuantity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Created
              </p>
              <p className="text-sm font-semibold">
                {new Date(storageBox.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Last Updated
              </p>
              <p className="text-sm font-semibold">
                {new Date(storageBox.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Miniatures in this box */}
      <Card className="warhammer-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase tracking-wide text-primary">
            Miniatures in this Box
          </CardTitle>
          <CardDescription>
            {miniatureCount === 0
              ? "No miniatures stored here yet"
              : `${miniatureCount} ${miniatureCount === 1 ? "model" : "models"} stored in this box`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!miniatures || miniatures.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Miniatures</h3>
              <p className="text-muted-foreground mt-2">
                Assign miniatures to this storage box from the collection page
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {miniatures.map((miniature) => {
                const status = Array.isArray(miniature.miniature_status)
                  ? miniature.miniature_status[0]?.status
                  : miniature.miniature_status?.status;
                const faction = Array.isArray(miniature.factions)
                  ? miniature.factions[0]
                  : miniature.factions;

                return (
                  <Link
                    key={miniature.id}
                    href={`/dashboard/miniatures/${miniature.id}`}
                    className="flex items-center justify-between p-3 rounded-sm border border-primary/20 hover:border-primary/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">
                          {miniature.name}
                        </p>
                        {faction && (
                          <p className="text-xs text-muted-foreground">{faction.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {miniature.quantity > 1 && (
                        <Badge variant="outline" className="border-primary/30">
                          x{miniature.quantity}
                        </Badge>
                      )}
                      {status && (
                        <Badge
                          variant={status === "completed" ? "default" : "secondary"}
                          className={
                            status === "completed"
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          {status}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
