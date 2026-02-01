"use client";

import { MiniatureCard } from "@/components/miniatures/miniature-card";
import { CollectionFilters, type FilterState } from "@/components/miniatures/collection-filters";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

interface MiniatureWithRelations {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
  faction_id?: string | null;
  unit_type?: string | null;
  factions: { id: string; name: string } | null;
  miniature_status: { status: string; completed_at?: string | null } | null;
  miniature_photos: { id: string; storage_path: string }[];
}

interface CollectionClientProps {
  miniatures: MiniatureWithRelations[];
  factions: { id: string; name: string }[];
  initialFilters: FilterState;
}

export function CollectionClient({ miniatures, factions, initialFilters }: CollectionClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Collection</h1>
          <p className="text-muted-foreground">{miniatures.length} miniatures</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collection/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Miniature
          </Link>
        </Button>
      </div>

      <CollectionFilters
        factions={factions}
        onFiltersChange={() => {}} // URL-based filtering, no need for callback
        initialFilters={initialFilters}
      />

      {miniatures.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No miniatures found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {miniatures.map((miniature) => (
            <MiniatureCard key={miniature.id} miniature={miniature} />
          ))}
        </div>
      )}
    </div>
  );
}
