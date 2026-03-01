import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MiniatureCard } from "@/components/miniatures/miniature-card";
import { CollectionDeleteButton } from "@/components/collections/collection-delete-button";
import { AddMiniaturesDialog } from "@/components/collections/add-miniatures-dialog";

interface Props {
  params: Promise<{ id: string }>;
}

// Supabase returns nested relations as arrays
interface CollectionMiniatureRow {
  miniature_id: string;
  display_order: number;
  miniatures: {
    id: string;
    name: string;
    quantity: number;
    created_at: string;
    factions: { name: string } | { name: string }[];
    miniature_status:
      | { status: string; completed_at: string | null; based?: boolean; magnetised?: boolean }
      | { status: string; completed_at: string | null; based?: boolean; magnetised?: boolean }[];
    miniature_photos: { id: string; storage_path: string }[];
  }[] | null;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !collection) {
    notFound();
  }

  const { data: collectionMiniatures } = await supabase
    .from("collection_miniatures")
    .select(
      `
      miniature_id,
      display_order,
      miniatures (
        id,
        name,
        quantity,
        created_at,
        factions (name),
        miniature_status (status, completed_at, based, magnetised),
        miniature_photos (id, storage_path, image_updated_at)
      )
    `
    )
    .eq("collection_id", id)
    .order("display_order", { ascending: true });

  // Transform the data structure (Supabase returns nested relations as arrays)
  const miniatures = (collectionMiniatures || [])
    .map((cm: CollectionMiniatureRow) => {
      const m = Array.isArray(cm.miniatures) ? cm.miniatures[0] : cm.miniatures;
      if (!m) return null;
      return {
        ...m,
        factions: Array.isArray(m.factions) ? m.factions[0] : m.factions,
        miniature_status: Array.isArray(m.miniature_status) ? m.miniature_status[0] : m.miniature_status,
        miniature_photos: Array.isArray(m.miniature_photos) ? m.miniature_photos : [],
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/dashboard/collections">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collections
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: collection.color || "#3b82f6" }}
              />
              <h1 className="text-3xl font-bold">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {miniatures.length} {miniatures.length === 1 ? "miniature" : "miniatures"}
            </p>
          </div>

          <div className="flex gap-2">
            <AddMiniaturesDialog collectionId={id}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Miniatures
              </Button>
            </AddMiniaturesDialog>
            <Link href={`/dashboard/collections/${id}/edit`}>
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <CollectionDeleteButton collectionId={id} collectionName={collection.name} />
          </div>
        </div>
      </div>

      {miniatures.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">This collection is empty</p>
            <AddMiniaturesDialog collectionId={id}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Miniatures
              </Button>
            </AddMiniaturesDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {miniatures.map((miniature) => (
            <MiniatureCard key={miniature.id} miniature={miniature} />
          ))}
        </div>
      )}
    </div>
  );
}
