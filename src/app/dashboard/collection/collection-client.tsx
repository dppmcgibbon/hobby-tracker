"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MiniatureCard } from "@/components/miniatures/miniature-card";
import { CollectionFilters, type FilterState } from "@/components/miniatures/collection-filters";
import { Plus, Package } from "lucide-react";
import type { Miniature, Faction, MiniatureStatus } from "@/types";

interface MiniatureWithRelations extends Miniature {
  faction?: { name: string; color_hex?: string } | null;
  status?: MiniatureStatus | null;
  photos?: { storage_path: string }[];
}

interface CollectionPageProps {
  miniatures: MiniatureWithRelations[];
  factions: Faction[];
}

export default function CollectionPageClient({ miniatures, factions }: CollectionPageProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    faction: null,
    status: null,
  });

  const filteredMiniatures = useMemo(() => {
    return miniatures.filter((miniature) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          miniature.name.toLowerCase().includes(searchLower) ||
          miniature.faction?.name.toLowerCase().includes(searchLower) ||
          miniature.unit_type?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Faction filter
      if (filters.faction && miniature.faction_id !== filters.faction) {
        return false;
      }

      // Status filter
      if (filters.status && miniature.status?.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [miniatures, filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Collection</h1>
          <p className="text-muted-foreground">
            {filteredMiniatures.length} of {miniatures.length} miniatures
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collection/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Miniature
          </Link>
        </Button>
      </div>

      <CollectionFilters factions={factions} onFilterChange={setFilters} />

      {filteredMiniatures.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No miniatures found</h3>
          <p className="text-muted-foreground mt-2">
            {miniatures.length === 0
              ? "Start by adding your first miniature to your collection."
              : "Try adjusting your filters."}
          </p>
          {miniatures.length === 0 && (
            <Button asChild className="mt-4">
              <Link href="/dashboard/collection/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Miniature
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMiniatures.map((miniature) => (
            <MiniatureCard key={miniature.id} miniature={miniature} />
          ))}
        </div>
      )}
    </div>
  );
}
