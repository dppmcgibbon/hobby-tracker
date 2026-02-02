import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { CollectionEditForm } from "@/components/collections/collection-edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectionEditPage({ params }: Props) {
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

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Edit Collection</h1>
      <CollectionEditForm collection={collection} />
    </div>
  );
}
