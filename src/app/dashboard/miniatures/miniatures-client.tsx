"use client";

import { MiniatureCard } from "@/components/miniatures/miniature-card";
import { MiniatureTableView } from "@/components/miniatures/miniature-table-view";
import { CollectionFilters, type FilterState } from "@/components/miniatures/collection-filters";
import { TagManager } from "@/components/miniatures/tag-manager";
import { BatchOperationsBar } from "@/components/miniatures/batch-operations-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Package,
  Tag,
  Grid3x3,
  List,
  Save,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMiniatureStatusDisplayLabel } from "@/lib/constants/miniature-status";

type GridSortField =
  | "created"
  | "name"
  | "faction"
  | "unit"
  | "status"
  | "status_name"
  | "quantity";
type SortDirection = "asc" | "desc";

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

interface MiniatureStatusRow {
  name: string;
  display_order?: number | null;
}

interface CollectionClientProps {
  miniatures: MiniatureWithRelations[];
  miniatureStatusRows: MiniatureStatusRow[];
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
  savedFilters?: Array<{
    id: string;
    name: string;
    filters: Record<string, string>;
    logo_url?: string | null;
    is_starred: boolean;
  }>;
  initialFilters: FilterState;
}

export function CollectionClient({
  miniatures,
  miniatureStatusRows,
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
  savedFilters = [],
  initialFilters,
}: CollectionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [gridSortField, setGridSortField] = useState<GridSortField>("created");
  const [gridSortDirection, setGridSortDirection] = useState<SortDirection>("desc");
  const [savedFilter, setSavedFilter] = useState<string | null>(null);
  const [hasSavedFilter, setHasSavedFilter] = useState(false);

  // Load saved view mode, grid sort preferences, and saved filter from localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedView = localStorage.getItem("miniatures_view_mode") as "grid" | "table" | null;
        if (savedView === "grid" || savedView === "table") {
          setViewMode(savedView);
        }
        const savedSortField = localStorage.getItem(
          "miniatures_grid_sort_field"
        ) as GridSortField | null;
        if (
          savedSortField &&
          ["created", "name", "faction", "unit", "status", "status_name", "quantity"].includes(
            savedSortField
          )
        ) {
          setGridSortField(savedSortField);
        }
        const savedSortDir = localStorage.getItem(
          "miniatures_grid_sort_dir"
        ) as SortDirection | null;
        if (savedSortDir === "asc" || savedSortDir === "desc") {
          setGridSortDirection(savedSortDir);
        }

        const saved = localStorage.getItem("savedFilter");
        if (saved) {
          setSavedFilter(saved);
          setHasSavedFilter(true);
        }
      } catch {
        // Ignore localStorage errors
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("miniatures_view_mode", mode);
    } catch {}
  };

  const handleSortFieldChange = (newField: GridSortField) => {
    setGridSortField(newField);
    try {
      localStorage.setItem("miniatures_grid_sort_field", newField);
    } catch {}

    const defaultDir: SortDirection =
      newField === "created" || newField === "quantity" ? "desc" : "asc";
    setGridSortDirection(defaultDir);
    try {
      localStorage.setItem("miniatures_grid_sort_dir", defaultDir);
    } catch {}
  };

  const handleToggleSortDirection = () => {
    setGridSortDirection((prev) => {
      const next: SortDirection = prev === "asc" ? "desc" : "asc";
      try {
        localStorage.setItem("miniatures_grid_sort_dir", next);
      } catch {}
      return next;
    });
  };

  const statusOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    miniatureStatusRows.forEach((row, index) => {
      map.set(row.name.toLowerCase(), row.display_order ?? index);
    });
    return map;
  }, [miniatureStatusRows]);

  const sortedMiniatures = useMemo(() => {
    const list = [...miniatures];
    return list.sort((a, b) => {
      let comparison = 0;

      switch (gridSortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;

        case "faction": {
          const factionA = a.factions?.name || "";
          const factionB = b.factions?.name || "";
          if (!factionA && factionB) comparison = 1;
          else if (factionA && !factionB) comparison = -1;
          else comparison = factionA.localeCompare(factionB, undefined, { sensitivity: "base" });

          if (comparison === 0) {
            const unitA = a.unit_type || "";
            const unitB = b.unit_type || "";
            comparison = unitA.localeCompare(unitB, undefined, { sensitivity: "base" });
            if (comparison === 0) {
              comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
            }
          }
          break;
        }

        case "unit": {
          const unitA = a.unit_type || "";
          const unitB = b.unit_type || "";
          if (!unitA && unitB) comparison = 1;
          else if (unitA && !unitB) comparison = -1;
          else comparison = unitA.localeCompare(unitB, undefined, { sensitivity: "base" });

          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          }
          break;
        }

        case "status": {
          const statusA = (a.miniature_status?.status || "").toLowerCase();
          const statusB = (b.miniature_status?.status || "").toLowerCase();
          const orderA = statusOrderMap.get(statusA) ?? 999;
          const orderB = statusOrderMap.get(statusB) ?? 999;
          comparison = orderA - orderB;
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          }
          break;
        }

        case "status_name": {
          const statusA = getMiniatureStatusDisplayLabel(a.miniature_status?.status || "backlog");
          const statusB = getMiniatureStatusDisplayLabel(b.miniature_status?.status || "backlog");
          comparison = statusA.localeCompare(statusB, undefined, { sensitivity: "base" });
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          }
          break;
        }

        case "quantity":
          comparison = (a.quantity || 0) - (b.quantity || 0);
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          }
          break;

        case "created":
        default: {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = timeA - timeB;
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          }
          break;
        }
      }

      return gridSortDirection === "asc" ? comparison : -comparison;
    });
  }, [miniatures, gridSortField, gridSortDirection, statusOrderMap]);

  const getSortDirectionText = (field: GridSortField, dir: SortDirection) => {
    if (field === "created") {
      return dir === "asc" ? "Oldest First" : "Newest First";
    }
    if (field === "quantity") {
      return dir === "asc" ? "Low → High" : "High → Low";
    }
    if (field === "status") {
      return dir === "asc" ? "Backlog → Done" : "Done → Backlog";
    }
    return dir === "asc" ? "A → Z" : "Z → A";
  };

  const handleSaveFilter = () => {
    const currentParams = searchParams.toString();
    setSavedFilter(currentParams);
    setHasSavedFilter(true);
    // Optionally save to localStorage for persistence
    localStorage.setItem("savedFilter", currentParams);
  };

  const handleLoadFilter = () => {
    const filterToLoad = savedFilter || localStorage.getItem("savedFilter");
    if (filterToLoad) {
      router.push(`/dashboard/miniatures?${filterToLoad}`);
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
          <p className="text-muted-foreground">
            {totalQuantity} miniature{totalQuantity !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 border border-primary/20 rounded-sm overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => handleViewModeChange("grid")}
              className={viewMode === "grid" ? "btn-warhammer-primary" : ""}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              onClick={() => handleViewModeChange("table")}
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
          <Button variant="outline" onClick={handleSaveFilter} title="Save current filter">
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
        miniatureStatusRows={miniatureStatusRows}
        savedFilters={savedFilters}
        onFiltersChange={() => {}} // URL-based filtering, no need for callback
        initialFilters={initialFilters}
      />

      {miniatures.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold uppercase tracking-wide">
            No miniatures found
          </h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/40 border border-primary/20 rounded-md p-3">
            <p className="text-sm text-muted-foreground">
              Displaying <span className="font-semibold text-primary">{totalQuantity}</span>{" "}
              miniature
              {totalQuantity !== 1 ? "s" : ""}
              {sortedMiniatures.length !== totalQuantity && (
                <span className="text-xs ml-1.5 text-muted-foreground/80">
                  ({sortedMiniatures.length} unique model{sortedMiniatures.length !== 1 ? "s" : ""})
                </span>
              )}
            </p>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:inline-block">
                Sort:
              </span>
              <Select
                value={gridSortField}
                onValueChange={(v) => handleSortFieldChange(v as GridSortField)}
              >
                <SelectTrigger className="w-[170px] h-8 text-xs border-primary/20 bg-background/80 hover:bg-background">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Date Added</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="faction">Faction</SelectItem>
                  <SelectItem value="unit">Unit Type</SelectItem>
                  <SelectItem value="status">Status (Workflow)</SelectItem>
                  <SelectItem value="status_name">Status (A–Z)</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs flex items-center gap-1.5 border-primary/20 bg-background/80 hover:bg-background"
                onClick={handleToggleSortDirection}
                title={`Sorted ${getSortDirectionText(gridSortField, gridSortDirection)}. Click to reverse order.`}
              >
                {gridSortDirection === "asc" ? (
                  <>
                    <ArrowUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">
                      {getSortDirectionText(gridSortField, "asc")}
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">
                      {getSortDirectionText(gridSortField, "desc")}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedMiniatures.map((miniature) => (
              <MiniatureCard
                key={miniature.id}
                miniature={miniature}
                selectable={selectionMode}
                selected={selectedIds.includes(miniature.id)}
                onSelectChange={handleSelectChange}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end mb-4">
            <p className="text-sm text-muted-foreground">
              Displaying <span className="font-semibold text-primary">{totalQuantity}</span>{" "}
              miniature
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
        statusRows={miniatureStatusRows.map((r) => ({ name: r.name }))}
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
