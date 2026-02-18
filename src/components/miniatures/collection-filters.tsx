"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "use-debounce";
import { SaveFilterDialog } from "./save-filter-dialog";
import { SavedFiltersSheet } from "./saved-filters-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CollectionFiltersProps {
  factions: { id: string; name: string }[];
  tags: { id: string; name: string; color: string | null }[];
  storageBoxes: { id: string; name: string; location?: string | null }[];
  universes: { id: string; name: string }[];
  games: { id: string; name: string; universe_id?: string | null }[];
  editions: { id: string; name: string; year: number | null }[];
  expansions: { id: string; name: string; year: number | null }[];
  unitTypes: string[];
  bases: { id: string; name: string }[];
  miniatures: any[]; // The miniatures to determine available options
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
  savedFilters?: Array<{
    id: string;
    name: string;
    filters: Record<string, string>;
    logo_url?: string | null;
    is_starred: boolean;
  }>;
}

export interface FilterState {
  search: string;
  factionId: string;
  status: string;
  tagId: string;
  storageBoxId: string;
  universeId: string;
  gameId: string;
  editionId: string;
  expansionId: string;
  unitType: string;
  baseSize: string;
  hasPhotos: string; // "all" | "yes" | "no"
  magnetised: string; // "all" | "yes" | "no"
  based: string; // "all" | "yes" | "no"
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "unknown", label: "Unknown" },
  { value: "missing", label: "Missing" },
  { value: "needs_stripped", label: "Needs Stripped" },
  { value: "backlog", label: "Backlog" },
  { value: "built", label: "Built" },
  { value: "primed", label: "Primed" },
  { value: "painting_started", label: "Painting Started" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "sub_assembled", label: "Sub-Assembled" },
  { value: "missing_arm", label: "Missing Arm" },
  { value: "missing_leg", label: "Missing Leg" },
  { value: "missing_head", label: "Missing Head" },
  { value: "complete", label: "Complete" },
];

export function CollectionFilters({
  factions,
  tags,
  storageBoxes,
  universes,
  games,
  editions,
  expansions,
  unitTypes,
  bases,
  miniatures,
  onFiltersChange,
  initialFilters,
  savedFilters = [],
}: CollectionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL or defaults
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get("search") || initialFilters?.search || "",
    factionId: searchParams.get("faction") || initialFilters?.factionId || "all",
    status: searchParams.get("status") || initialFilters?.status || "all",
    tagId: searchParams.get("tag") || initialFilters?.tagId || "all",
    storageBoxId: searchParams.get("storage") || initialFilters?.storageBoxId || "all",
    universeId: searchParams.get("universe") || initialFilters?.universeId || "all",
    gameId: searchParams.get("game") || initialFilters?.gameId || "all",
    editionId: searchParams.get("edition") || initialFilters?.editionId || "all",
    expansionId: searchParams.get("expansion") || initialFilters?.expansionId || "all",
    unitType: searchParams.get("unit") || initialFilters?.unitType || "all",
    baseSize: searchParams.get("base_size") || initialFilters?.baseSize || "all",
    hasPhotos: searchParams.get("photos") || initialFilters?.hasPhotos || "all",
    magnetised: searchParams.get("magnetised") || initialFilters?.magnetised || "all",
    based: searchParams.get("based") || initialFilters?.based || "all",
  });

  // Debounce search input
  const [debouncedSearch] = useDebounce(filters.search, 300);

  // Sync filters with URL when searchParams change externally
  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      factionId: searchParams.get("faction") || "all",
      status: searchParams.get("status") || "all",
      tagId: searchParams.get("tag") || "all",
      storageBoxId: searchParams.get("storage") || "all",
      universeId: searchParams.get("universe") || "all",
      gameId: searchParams.get("game") || "all",
      editionId: searchParams.get("edition") || "all",
      expansionId: searchParams.get("expansion") || "all",
      unitType: searchParams.get("unit") || "all",
      baseSize: searchParams.get("base_size") || "all",
      hasPhotos: searchParams.get("photos") || "all",
      magnetised: searchParams.get("magnetised") || "all",
      based: searchParams.get("based") || "all",
    });
  }, [searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.factionId !== "all") params.set("faction", filters.factionId);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.tagId !== "all") params.set("tag", filters.tagId);
    if (filters.storageBoxId !== "all") params.set("storage", filters.storageBoxId);
    if (filters.universeId !== "all") params.set("universe", filters.universeId);
    if (filters.gameId !== "all") params.set("game", filters.gameId);
    if (filters.editionId !== "all") params.set("edition", filters.editionId);
    if (filters.expansionId !== "all") params.set("expansion", filters.expansionId);
    if (filters.unitType !== "all") params.set("unit", filters.unitType);
    if (filters.baseSize !== "all") params.set("base_size", filters.baseSize);
    if (filters.hasPhotos !== "all") params.set("photos", filters.hasPhotos);
    if (filters.magnetised !== "all") params.set("magnetised", filters.magnetised);
    if (filters.based !== "all") params.set("based", filters.based);

    // Note: We intentionally reset to page 1 when filters change
    // The miniature-table-view will preserve page when data updates happen
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    const currentUrl = `${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    // Only update if URL actually changed
    if (newUrl !== currentUrl) {
      router.push(newUrl, { scroll: false });
      // Force a refresh to ensure server component re-renders with new data
      router.refresh();
    }

    // Notify parent component
    onFiltersChange({
      ...filters,
      search: debouncedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    filters.factionId,
    filters.status,
    filters.tagId,
    filters.storageBoxId,
    filters.universeId,
    filters.gameId,
    filters.editionId,
    filters.expansionId,
    filters.unitType,
    filters.baseSize,
    filters.hasPhotos,
    filters.magnetised,
    filters.based,
  ]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      factionId: "all",
      status: "all",
      tagId: "all",
      storageBoxId: "all",
      universeId: "all",
      gameId: "all",
      editionId: "all",
      expansionId: "all",
      unitType: "all",
      baseSize: "all",
      hasPhotos: "all",
      magnetised: "all",
      based: "all",
    };
    setFilters(defaultFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.factionId !== "all" ||
    filters.status !== "all" ||
    filters.tagId !== "all" ||
    filters.storageBoxId !== "all" ||
    filters.universeId !== "all" ||
    filters.gameId !== "all" ||
    filters.editionId !== "all" ||
    filters.expansionId !== "all" ||
    filters.unitType !== "all" ||
    filters.baseSize !== "all" ||
    filters.hasPhotos !== "all" ||
    filters.magnetised !== "all" ||
    filters.based !== "all";

  const activeFilterCount = [
    filters.search,
    filters.factionId !== "all",
    filters.status !== "all",
    filters.tagId !== "all",
    filters.storageBoxId !== "all",
    filters.universeId !== "all",
    filters.gameId !== "all",
    filters.editionId !== "all",
    filters.expansionId !== "all",
    filters.unitType !== "all",
    filters.baseSize !== "all",
    filters.hasPhotos !== "all",
    filters.magnetised !== "all",
    filters.based !== "all",
  ].filter(Boolean).length;

  // Filter games based on selected universe (client-side)
  const filteredGames = filters.universeId === "all" 
    ? games 
    : games.filter(game => game.universe_id === filters.universeId);

  // Filter miniatures based on universe and game to determine available factions/units
  let relevantMiniatures = miniatures;
  
  // First filter by universe (via games)
  if (filters.universeId !== "all") {
    const universeGameIds = new Set(filteredGames.map(g => g.id));
    relevantMiniatures = relevantMiniatures.filter((m: any) => {
      // Check if miniature has any game links to games in this universe
      return m.miniature_games?.some((mg: any) => universeGameIds.has(mg.game_id));
    });
  }
  
  // Then filter by specific game
  if (filters.gameId !== "all" && filters.gameId !== "none") {
    relevantMiniatures = relevantMiniatures.filter((m: any) => {
      return m.miniature_games?.some((mg: any) => mg.game_id === filters.gameId);
    });
  } else if (filters.gameId === "none") {
    // Show miniatures with no game links
    relevantMiniatures = relevantMiniatures.filter((m: any) => {
      return !m.miniature_games || m.miniature_games.length === 0;
    });
  }

  // Get available factions from relevant miniatures
  // Only filter factions when universe or game filters are active
  // Otherwise show all factions to avoid 1000-row limit issues
  let filteredFactions = factions;
  
  if (filters.universeId !== "all" || filters.gameId !== "all") {
    const availableFactionIds = new Set(
      relevantMiniatures
        .map((m: any) => m.faction_id || m.factions?.id)
        .filter((id: any) => id != null)
    );
    filteredFactions = factions.filter(f => availableFactionIds.has(f.id));
  }

  // Get available unit types from relevant miniatures
  // Only filter unit types when universe or game filters are active
  // Otherwise show all unit types to avoid 1000-row limit issues
  let availableUnitTypes: string[] = [];
  
  if (filters.universeId !== "all" || filters.gameId !== "all") {
    availableUnitTypes = Array.from(
      new Set(
        relevantMiniatures
          .map((m: any) => m.unit_type)
          .filter((ut: any) => ut != null && ut !== "")
      )
    ).sort();
  } else {
    // When no filters, show all unit types from all miniatures
    availableUnitTypes = unitTypes;
  }

  // Get available statuses from relevant miniatures
  // Only filter statuses when universe or game filters are active
  // Otherwise show all statuses to avoid 1000-row limit issues
  let availableStatuses = new Set<string>();
  
  if (filters.universeId !== "all" || filters.gameId !== "all") {
    availableStatuses = new Set(
      relevantMiniatures
        .map((m: any) => m.miniature_status?.status)
        .filter((status: any) => status != null)
    );
  } else {
    // When no filters, show all possible statuses
    availableStatuses = new Set(STATUS_OPTIONS.map(opt => opt.value).filter(v => v !== "all"));
  }

  // Always show all storage boxes regardless of filters
  // This ensures users can always select any storage box even if it's empty
  // or contains miniatures that don't match current filters
  const filteredStorageBoxes = storageBoxes;

  return (
    <div className="space-y-4">
      {/* Filters - Visible on all screen sizes */}
      <div className="space-y-3">
        {/* Top Row - Game Filters */}
        <div className="flex gap-4 flex-wrap items-end">
          {/* Universe Filter */}
          {universes.length > 0 && (
            <div className="w-[220px]">
              <Select
                value={filters.universeId}
                onValueChange={(v) => {
                  updateFilter("universeId", v);
                  // Always reset dependent filters when universe changes
                  updateFilter("gameId", "all");
                  updateFilter("editionId", "all");
                  updateFilter("expansionId", "all");
                  updateFilter("factionId", "all");
                  updateFilter("unitType", "all");
                  updateFilter("status", "all");
                }}
              >
                <SelectTrigger id="universe" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universes</SelectItem>
                  {universes.map((universe) => (
                    <SelectItem key={universe.id} value={universe.id}>
                      {universe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Game Filter */}
          {filteredGames.length > 0 && (
            <div className="w-[456px]">
              <Select
                value={filters.gameId}
                onValueChange={(v) => {
                  updateFilter("gameId", v);
                  // Always reset dependent filters when game changes
                  updateFilter("editionId", "all");
                  updateFilter("expansionId", "all");
                  updateFilter("factionId", "all");
                  updateFilter("unitType", "all");
                  updateFilter("status", "all");
                }}
              >
                <SelectTrigger id="game" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {filteredGames.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Edition Filter - only show if game is selected */}
          {filters.gameId !== "all" && filters.gameId !== "none" && editions.length > 0 && (
            <div className="w-[220px]">
              <Select
                value={filters.editionId}
                onValueChange={(v) => {
                  updateFilter("editionId", v);
                  // Always reset dependent filters when edition changes
                  updateFilter("expansionId", "all");
                }}
              >
                <SelectTrigger id="edition" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Editions</SelectItem>
                  {editions.map((edition) => (
                    <SelectItem key={edition.id} value={edition.id}>
                      {edition.name}
                      {edition.year && ` (${edition.year})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expansion Filter - only show if edition is selected */}
          {filters.editionId !== "all" && expansions.length > 0 && (
            <div className="w-[220px]">
              <Select
                value={filters.expansionId}
                onValueChange={(v) => updateFilter("expansionId", v)}
              >
                <SelectTrigger id="expansion" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expansions</SelectItem>
                  {expansions.map((expansion) => (
                    <SelectItem key={expansion.id} value={expansion.id}>
                      {expansion.name}
                      {expansion.year && ` (${expansion.year})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Bottom Row - Other Filters */}
        <div className="flex gap-4 flex-wrap items-end">
          {/* Faction Filter */}
          <div className="w-[220px]">
            <Select value={filters.factionId} onValueChange={(v) => updateFilter("factionId", v)}>
              <SelectTrigger id="faction" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Factions</SelectItem>
                {filteredFactions.map((faction) => (
                  <SelectItem key={faction.id} value={faction.id}>
                    {faction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Type Filter */}
          {availableUnitTypes.length > 0 && (
            <div className="w-[220px]">
              <Select value={filters.unitType} onValueChange={(v) => updateFilter("unitType", v)}>
                <SelectTrigger id="unitType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {availableUnitTypes.map((unitType) => (
                    <SelectItem key={unitType} value={unitType}>
                      {unitType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Base Size Filter */}
          {bases.length > 0 && (
            <div className="w-[220px]">
              <Select value={filters.baseSize} onValueChange={(v) => updateFilter("baseSize", v)}>
                <SelectTrigger id="baseSize" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Base Sizes</SelectItem>
                  <SelectItem value="none">No Base Defined</SelectItem>
                  {bases.map((base) => (
                    <SelectItem key={base.id} value={base.id}>
                      {base.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Filter */}
          <div className="w-[220px]">
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter(option => 
                  option.value === "all" || availableStatuses.has(option.value)
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Box Filter */}
          <div className="w-[220px]">
            <Select
              value={filters.storageBoxId}
              onValueChange={(v) => updateFilter("storageBoxId", v)}
            >
              <SelectTrigger id="storage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Storage</SelectItem>
                <SelectItem value="none">No Storage Box</SelectItem>
                {filteredStorageBoxes.map((box) => (
                  <SelectItem key={box.id} value={box.id}>
                    {box.name}
                    {box.location && ` (${box.location})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter */}
          <div className="w-[220px]">
            <Select value={filters.tagId} onValueChange={(v) => updateFilter("tagId", v)}>
              <SelectTrigger id="tag" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search by name..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>

          {/* No Linked Games Filter */}
          <Button
            variant={filters.gameId === "none" ? "default" : "outline"}
            onClick={() => {
              if (filters.gameId === "none") {
                updateFilter("gameId", "all");
                updateFilter("editionId", "all");
                updateFilter("expansionId", "all");
              } else {
                updateFilter("gameId", "none");
                updateFilter("editionId", "all");
                updateFilter("expansionId", "all");
              }
            }}
            className="whitespace-nowrap"
          >
            No Linked Games
          </Button>

          {/* Photo Filter */}
          <Button
            variant={filters.hasPhotos === "no" ? "default" : "outline"}
            onClick={() => updateFilter("hasPhotos", filters.hasPhotos === "no" ? "all" : "no")}
            className="whitespace-nowrap"
          >
            No Photos
          </Button>

          {/* Magnetised Filter */}
          <Button
            variant={filters.magnetised === "no" ? "default" : "outline"}
            onClick={() => updateFilter("magnetised", filters.magnetised === "no" ? "all" : "no")}
            className="whitespace-nowrap"
          >
            Not Magnetised
          </Button>

          {/* Based Filter */}
          <Button
            variant={filters.based === "no" ? "default" : "outline"}
            onClick={() => updateFilter("based", filters.based === "no" ? "all" : "no")}
            className="whitespace-nowrap"
          >
            Not Based
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="default">
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}

          {/* Save Filter Button */}
          <SaveFilterDialog currentFilters={filters} />

          {/* Saved Filters Sheet */}
          <SavedFiltersSheet savedFilters={savedFilters} />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search miniatures..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Sheet */}
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh]">
              <SheetHeader>
                <SheetTitle>Filter & Sort</SheetTitle>
                <SheetDescription>Customize your collection view</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {/* Universe */}
                <div>
                  <Label htmlFor="mobile-universe">Universe</Label>
                  <Select
                    value={filters.universeId}
                    onValueChange={(v) => {
                      updateFilter("universeId", v);
                      // Always reset dependent filters when universe changes
                      updateFilter("gameId", "all");
                      updateFilter("editionId", "all");
                      updateFilter("expansionId", "all");
                      updateFilter("factionId", "all");
                      updateFilter("unitType", "all");
                      updateFilter("status", "all");
                    }}
                  >
                    <SelectTrigger id="mobile-universe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Universes</SelectItem>
                      {universes.map((universe) => (
                        <SelectItem key={universe.id} value={universe.id}>
                          {universe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Game */}
                <div>
                  <Label htmlFor="mobile-game">Game</Label>
                  <Select
                    value={filters.gameId}
                    onValueChange={(v) => {
                      updateFilter("gameId", v);
                      // Always reset dependent filters when game changes
                      updateFilter("editionId", "all");
                      updateFilter("expansionId", "all");
                      updateFilter("factionId", "all");
                      updateFilter("unitType", "all");
                      updateFilter("status", "all");
                    }}
                  >
                    <SelectTrigger id="mobile-game">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      {filteredGames.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Edition - only show if game is selected */}
                {filters.gameId !== "all" && filters.gameId !== "none" && editions.length > 0 && (
                  <div>
                    <Label htmlFor="mobile-edition">Edition</Label>
                    <Select
                      value={filters.editionId}
                      onValueChange={(v) => {
                        updateFilter("editionId", v);
                        // Always reset dependent filters when edition changes
                        updateFilter("expansionId", "all");
                      }}
                    >
                      <SelectTrigger id="mobile-edition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Editions</SelectItem>
                        {editions.map((edition) => (
                          <SelectItem key={edition.id} value={edition.id}>
                            {edition.name}
                            {edition.year && ` (${edition.year})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Expansion - only show if edition is selected */}
                {filters.editionId !== "all" && expansions.length > 0 && (
                  <div>
                    <Label htmlFor="mobile-expansion">Expansion</Label>
                    <Select
                      value={filters.expansionId}
                      onValueChange={(v) => updateFilter("expansionId", v)}
                    >
                      <SelectTrigger id="mobile-expansion">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Expansions</SelectItem>
                        {expansions.map((expansion) => (
                          <SelectItem key={expansion.id} value={expansion.id}>
                            {expansion.name}
                            {expansion.year && ` (${expansion.year})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Faction */}
                <div>
                  <Label htmlFor="mobile-faction">Faction</Label>
                  <Select
                    value={filters.factionId}
                    onValueChange={(v) => updateFilter("factionId", v)}
                  >
                    <SelectTrigger id="mobile-faction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Factions</SelectItem>
                      {filteredFactions.map((faction) => (
                        <SelectItem key={faction.id} value={faction.id}>
                          {faction.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Type */}
                {availableUnitTypes.length > 0 && (
                  <div>
                    <Label htmlFor="mobile-unit">Unit</Label>
                    <Select value={filters.unitType} onValueChange={(v) => updateFilter("unitType", v)}>
                      <SelectTrigger id="mobile-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        {availableUnitTypes.map((unitType) => (
                          <SelectItem key={unitType} value={unitType}>
                            {unitType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Base Size */}
                {bases.length > 0 && (
                  <div>
                    <Label htmlFor="mobile-baseSize">Base Size</Label>
                    <Select value={filters.baseSize} onValueChange={(v) => updateFilter("baseSize", v)}>
                      <SelectTrigger id="mobile-baseSize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Base Sizes</SelectItem>
                        <SelectItem value="none">No Base Defined</SelectItem>
                        {bases.map((base) => (
                          <SelectItem key={base.id} value={base.id}>
                            {base.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <Label htmlFor="mobile-photos">Photos</Label>
                  <Select value={filters.hasPhotos} onValueChange={(v) => updateFilter("hasPhotos", v)}>
                    <SelectTrigger id="mobile-photos">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Miniatures</SelectItem>
                      <SelectItem value="no">No Photos</SelectItem>
                      <SelectItem value="yes">Has Photos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="mobile-status">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger id="mobile-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.filter(option => 
                        option.value === "all" || availableStatuses.has(option.value)
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tag */}
                <div>
                  <Label htmlFor="mobile-tag">Tag</Label>
                  <Select value={filters.tagId} onValueChange={(v) => updateFilter("tagId", v)}>
                    <SelectTrigger id="mobile-tag">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            {tag.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                            )}
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Storage Box */}
                <div>
                  <Label htmlFor="mobile-storage">Storage</Label>
                  <Select
                    value={filters.storageBoxId}
                    onValueChange={(v) => updateFilter("storageBoxId", v)}
                  >
                    <SelectTrigger id="mobile-storage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Storage</SelectItem>
                      <SelectItem value="none">No Storage Box</SelectItem>
                      {filteredStorageBoxes.map((box) => (
                        <SelectItem key={box.id} value={box.id}>
                          {box.name}
                          {box.location && ` (${box.location})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="icon">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary">
              Search: {filters.search}
              <button
                onClick={() => updateFilter("search", "")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.factionId !== "all" && (
            <Badge variant="secondary">
              Faction: {factions.find((f) => f.id === filters.factionId)?.name || filters.factionId}
              <button
                onClick={() => updateFilter("factionId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.unitType !== "all" && (
            <Badge variant="secondary">
              Unit: {filters.unitType}
              <button
                onClick={() => updateFilter("unitType", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.baseSize !== "all" && (
            <Badge variant="secondary">
              Base Size:{" "}
              {filters.baseSize === "none"
                ? "No Base Defined"
                : bases.find((b) => b.id === filters.baseSize)?.name || filters.baseSize}
              <button
                onClick={() => updateFilter("baseSize", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.hasPhotos !== "all" && (
            <Badge variant="secondary">
              Photos: {filters.hasPhotos === "no" ? "No Photos" : "Has Photos"}
              <button
                onClick={() => updateFilter("hasPhotos", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary">
              Status: {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
              <button
                onClick={() => updateFilter("status", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.tagId !== "all" && (
            <Badge variant="secondary">
              Tag: {tags.find((t) => t.id === filters.tagId)?.name || filters.tagId}
              <button
                onClick={() => updateFilter("tagId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.storageBoxId !== "all" && (
            <Badge variant="secondary">
              Storage:{" "}
              {filters.storageBoxId === "none"
                ? "No Storage Box"
                : storageBoxes.find((s) => s.id === filters.storageBoxId)?.name ||
                  filters.storageBoxId}
              <button
                onClick={() => updateFilter("storageBoxId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.universeId !== "all" && (
            <Badge variant="secondary">
              Universe: {universes.find((u) => u.id === filters.universeId)?.name || filters.universeId}
              <button
                onClick={() => {
                  updateFilter("universeId", "all");
                  updateFilter("gameId", "all");
                  updateFilter("editionId", "all");
                  updateFilter("expansionId", "all");
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.gameId !== "all" && (
            <Badge variant="secondary">
              Game:{" "}
              {filters.gameId === "none"
                ? "No Linked Games"
                : games.find((g) => g.id === filters.gameId)?.name || filters.gameId}
              <button
                onClick={() => {
                  updateFilter("gameId", "all");
                  updateFilter("editionId", "all");
                  updateFilter("expansionId", "all");
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.editionId !== "all" && (
            <Badge variant="secondary">
              Edition: {editions.find((e) => e.id === filters.editionId)?.name || filters.editionId}
              <button
                onClick={() => {
                  updateFilter("editionId", "all");
                  updateFilter("expansionId", "all");
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.expansionId !== "all" && (
            <Badge variant="secondary">
              Expansion:{" "}
              {expansions.find((e) => e.id === filters.expansionId)?.name || filters.expansionId}
              <button
                onClick={() => updateFilter("expansionId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
