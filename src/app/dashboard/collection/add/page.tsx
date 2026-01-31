import { requireAuth } from "@/lib/auth/server";
import { getFactions } from "@/lib/queries/miniatures";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniatureForm } from "@/components/miniatures/miniature-form";

export default async function AddMiniaturePage() {
  await requireAuth();
  const factions = await getFactions();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Miniature</h1>
        <p className="text-muted-foreground">Add a new miniature to your collection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miniature Details</CardTitle>
          <CardDescription>
            Enter the details of your miniature. Only the name is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MiniatureForm factions={factions} />
        </CardContent>
      </Card>
    </div>
  );
}
