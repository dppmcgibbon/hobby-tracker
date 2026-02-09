import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Archive, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function StoragePage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch storage boxes for the user
  const { data: storageBoxes } = await supabase
    .from("storage_boxes")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
            Storage Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize your miniatures by storage location
          </p>
        </div>
        <Button asChild className="btn-warhammer-primary">
          <Link href="/dashboard/storage/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Storage Box
          </Link>
        </Button>
      </div>

      {!storageBoxes || storageBoxes.length === 0 ? (
        <Card className="warhammer-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl uppercase tracking-wide text-primary">
              No Storage Boxes Yet
            </CardTitle>
            <CardDescription>
              Create storage boxes to organize your miniature collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="btn-warhammer-primary">
              <Link href="/dashboard/storage/add">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Storage Box
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storageBoxes.map((box) => (
            <Card
              key={box.id}
              className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Archive className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl uppercase tracking-wide">
                          {box.name}
                        </CardTitle>
                        {box.completed && (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white border-green-600"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      {box.location && (
                        <p className="text-sm text-muted-foreground mt-1">{box.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {box.description && (
                  <p className="text-sm text-muted-foreground mb-4">{box.description}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/dashboard/storage/${box.id}`}>View Details</Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/dashboard/storage/${box.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
