import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { getMiniatureById, getFactions } from "@/lib/queries/miniatures";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniatureForm } from "@/components/miniatures/miniature-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMiniaturePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  let miniature;
  try {
    miniature = await getMiniatureById(id, user.id);
  } catch {
    notFound();
  }

  const factions = await getFactions();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Miniature</h1>
        <p className="text-muted-foreground">Update the details of {miniature.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miniature Details</CardTitle>
          <CardDescription>Make changes to your miniature information.</CardDescription>
        </CardHeader>
        <CardContent>
          <MiniatureForm factions={factions} miniature={miniature} />
        </CardContent>
      </Card>
    </div>
  );
}
