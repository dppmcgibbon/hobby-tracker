import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import EditStorageBoxForm from "@/components/storage/edit-storage-box-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStorageBoxPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch storage box
  const { data: storageBox, error } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !storageBox) {
    notFound();
  }

  return <EditStorageBoxForm storageBox={storageBox} />;
}
