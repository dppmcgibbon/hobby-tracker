"use client";

import { MiniatureCard } from "@/components/miniatures/miniature-card";
import { MiniatureTableView } from "@/components/miniatures/miniature-table-view";
import { CollectionFilters, type FilterState } from "@/components/miniatures/collection-filters";
import { TagManager } from "@/components/miniatures/tag-manager";
import { BatchOperationsBar } from "@/components/miniatures/batch-operations-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package, Tag, Grid3x3, List, Save, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Collection {
  id: string;
  name: string;
}

interface StorageBox {
  id: string;
  name: string;
  location?: string | null;
}

interface Recipe {
  id: string;
  name: string;
  faction?: { name: string } | null;
}

interface CollectionClientProps {
  miniatures: MiniatureWithRelations[];
  factions: { id: string; name: string }[];
  tags: Tag[];
  collections: Collection[];
  universes: { id: string; name: string }[];
  storageBoxes: StorageBox[];
  recipes: Recipe[];
  games: { id: string; name: string }[];
  editions: { id: string; name: string; year: number | null }[];
  expansions: { id: string; name: string; year: number | null }[];
  unitTypes: string[];
  bases: { id: string; name: string }[];
  baseShapes: { id: string; name: string }[];
  baseTypes: { id: string; name: string }[];
  initialFilters: FilterState;
}

export function CollectionClient({
  miniatures,
  factions,
  tags,
  collections,
  universes,
  storageBoxes,
  recipes,
  games,
  editions,
  expansions,
  unitTypes,
  bases,
  baseShapes,
  baseTypes,
  initialFilters,
}: CollectionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [savedFilter, setSavedFilter] = useState<string | null>(null);
  const [hasSavedFilter, setHasSavedFilter] = useState(false);

  // Load saved filter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedFilter');
    if (saved) {
      setSavedFilter(saved);
      setHasSavedFilter(true);
    }
  }, []);

  const handleSaveFilter = () => {
    const currentParams = searchParams.toString();
    setSavedFilter(currentParams);
    setHasSavedFilter(true);
    // Optionally save to localStorage for persistence
    localStorage.setItem('savedFilter', currentParams);
  };

  const handleLoadFilter = () => {
    const filterToLoad = savedFilter || localStorage.getItem('savedFilter');
    if (filterToLoad) {
      router.push(`/dashboard/collection?${filterToLoad}`);
    }
  };

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      if (selected) {
        return [...prev, id];
      } else {
        return prev.filter((prevId) => prevId !== id);
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleSelectAll = () => {
    const allIds = miniatures.map((m) => m.id);
    setSelectedIds(allIds);
  };

  const handleToggleSelectionMode = () => {
    const newMode = !selectionMode;
    console.log("🔄 TOGGLING SELECTION MODE:", { from: selectionMode, to: newMode });
    setSelectionMode(newMode);
    if (selectionMode) {
      setSelectedIds([]);
    }
  };

  // Calculate total quantity
  const totalQuantity = miniatures.reduce((sum, m) => sum + (m.quantity || 0), 0);

  console.log("📦 CollectionClient render:", {
    selectionMode,
    selectedIdsCount: selectedIds.length,
    miniaturesCount: miniatures.length,
  });

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider">My Miniatures</h1>
          <p className="text-muted-foreground">{totalQuantity} miniature{totalQuantity !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 border border-primary/20 rounded-sm overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "btn-warhammer-primary" : ""}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "btn-warhammer-primary" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={handleToggleSelectionMode}
            className={selectionMode ? "btn-warhammer-primary" : ""}
          >
            {selectionMode ? "Cancel Selection" : "Select Multiple"}
          </Button>
          {selectionMode && (
            <Button variant="outline" onClick={handleSelectAll}>
              Select All
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowTagManager(!showTagManager)}>
            <Tag className="mr-2 h-4 w-4" />
            Manage Tags
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSaveFilter}
            title="Save current filter"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleLoadFilter}
            disabled={!hasSavedFilter}
            title="Load saved filter"
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showTagManager && (
        <div className="border rounded-lg p-6 bg-card">
          <TagManager tags={tags} />
        </div>
      )}

      <CollectionFilters
        factions={factions}
        tags={tags}
        storageBoxes={storageBoxes}
        universes={universes}
        games={games}
        editions={editions}
        expansions={expansions}
        unitTypes={unitTypes}
        bases={bases}
        miniatures={miniatures}
        onFiltersChange={() => {}} // URL-based filtering, no need for callback
        initialFilters={initialFilters}
      />

      {miniatures.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold uppercase tracking-wide">No miniatures found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {miniatures.map((miniature) => (
            <MiniatureCard
              key={miniature.id}
              miniature={miniature}
              selectable={selectionMode}
              selected={selectedIds.includes(miniature.id)}
              onSelectChange={handleSelectChange}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end mb-4">
            <p className="text-sm text-muted-foreground">
              Displaying <span className="font-semibold text-primary">{totalQuantity}</span> miniature
              {totalQuantity !== 1 ? "s" : ""}
            </p>
          </div>
          <MiniatureTableView
            miniatures={miniatures}
            selectable={selectionMode}
            selectedIds={selectedIds}
            onSelectChange={handleSelectChange}
          />
        </>
      )}

      <BatchOperationsBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        tags={tags}
        collections={collections}
        storageBoxes={storageBoxes}
        recipes={recipes}
        games={games}
        editions={editions}
        expansions={expansions}
        bases={bases}
        baseShapes={baseShapes}
        baseTypes={baseTypes}
        factions={factions}
      />
    </div>
  );
}
