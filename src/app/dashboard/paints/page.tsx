import { requireAuth } from "@/lib/auth/server";
import { getAllPaints, getUserPaints } from "@/lib/queries/paints";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaintInventoryList } from "@/components/paints/paint-inventory-list";
import { PaintCatalog } from "@/components/paints/paint-catalog";
import { Palette } from "lucide-react";

export default async function PaintsPage() {
  const user = await requireAuth();
  const [allPaints, userPaints] = await Promise.all([getAllPaints(), getUserPaints(user.id)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paint Inventory</h1>
          <p className="text-muted-foreground">
            {userPaints.length} paint{userPaints.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">My Inventory ({userPaints.length})</TabsTrigger>
          <TabsTrigger value="catalog">Paint Catalog ({allPaints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {userPaints.length === 0 ? (
            <div className="text-center py-12">
              <Palette className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No paints in inventory</h3>
              <p className="text-muted-foreground mb-4">
                Add paints from the catalog to track your collection
              </p>
            </div>
          ) : (
            <PaintInventoryList userPaints={userPaints} />
          )}
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <PaintCatalog paints={allPaints} userPaints={userPaints} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
