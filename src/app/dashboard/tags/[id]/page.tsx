import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag as TagIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniatureCard } from "@/components/miniatures/miniature-card";

interface Props {
  params: Promise<{ id: string }>;
}

// Supabase returns nested relations as arrays
interface TaggedMiniatureRow {
  miniature_id: string;
  miniatures: {
    id: string;
    name: string;
    quantity: number;
    created_at: string;
    factions: { name: string } | { name: string }[];
    miniature_status:
      | { status: string; completed_at: string | null }
      | { status: string; completed_at: string | null }[];
    miniature_photos: { id: string; storage_path: string }[];
  }[] | null;
}

export default async function TagDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch tag details
  const { data: tag, error } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !tag) {
    notFound();
  }

  // Fetch miniatures with this tag
  const { data: taggedMiniatures } = await supabase
    .from("miniature_tags")
    .select(
      `
      miniature_id,
      miniatures (
        id,
        name,
        quantity,
        created_at,
        factions (name),
        miniature_status (status, completed_at),
        miniature_photos (id, storage_path)
      )
    `
    )
    .eq("tag_id", id);

  // Transform the data structure (Supabase returns nested relations as arrays)
  const miniatures = (taggedMiniatures || [])
    .map((tm: TaggedMiniatureRow) => {
      const m = Array.isArray(tm.miniatures) ? tm.miniatures[0] : tm.miniatures;
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
        <Link href="/dashboard/tags">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tags
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: tag.color || "#3b82f6" }}
              >
                <TagIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold">{tag.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {miniatures.length} {miniatures.length === 1 ? "miniature" : "miniatures"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-lg px-4 py-2"
            style={{
              borderColor: tag.color || undefined,
              color: tag.color || undefined,
            }}
          >
            {tag.color || "#3b82f6"}
          </Badge>
        </div>
      </div>

      {miniatures.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No miniatures with this tag yet</p>
            <p className="text-sm text-muted-foreground">
              Go to your miniatures and assign this tag to organize them
            </p>
            <Link href="/dashboard/miniatures">
              <Button className="mt-4">Browse Miniatures</Button>
            </Link>
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
