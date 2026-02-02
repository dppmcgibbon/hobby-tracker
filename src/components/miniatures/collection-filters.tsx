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
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  search: string;
  factionId: string;
  status: string;
  tagId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "backlog", label: "Backlog" },
  { value: "assembled", label: "Assembled" },
  { value: "primed", label: "Primed" },
  { value: "painting", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Added" },
  { value: "name", label: "Name" },
  { value: "faction", label: "Faction" },
  { value: "status", label: "Status" },
  { value: "quantity", label: "Quantity" },
];

export function CollectionFilters({
  factions,
  tags,
  onFiltersChange,
  initialFilters,
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
    sortBy: searchParams.get("sortBy") || initialFilters?.sortBy || "created_at",
    sortOrder:
      (searchParams.get("sortOrder") as "asc" | "desc") || initialFilters?.sortOrder || "desc",
  });

  // Debounce search input
  const [debouncedSearch] = useDebounce(filters.search, 300);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.factionId !== "all") params.set("faction", filters.factionId);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.tagId !== "all") params.set("tag", filters.tagId);
    if (filters.sortBy !== "created_at") params.set("sortBy", filters.sortBy);
    if (filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });

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
    filters.sortBy,
    filters.sortOrder,
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
      sortBy: "created_at",
      sortOrder: "desc",
    };
    setFilters(defaultFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.factionId !== "all" ||
    filters.status !== "all" ||
    filters.tagId !== "all" ||
    filters.sortBy !== "created_at" ||
    filters.sortOrder !== "desc";

  const activeFilterCount = [
    filters.search,
    filters.factionId !== "all",
    filters.status !== "all",
    filters.tagId !== "all",
    filters.sortBy !== "created_at" || filters.sortOrder !== "desc",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:flex gap-4 flex-wrap items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Faction Filter */}
        <div className="min-w-[200px]">
          <Label htmlFor="faction">Faction</Label>
          <Select value={filters.factionId} onValueChange={(v) => updateFilter("factionId", v)}>
            <SelectTrigger id="faction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Factions</SelectItem>
              {factions.map((faction) => (
                <SelectItem key={faction.id} value={faction.id}>
                  {faction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[180px]">
          <Label htmlFor="status">Status</Label>
          <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag Filter */}
        <div className="min-w-[180px]">
          <Label htmlFor="tag">Tag</Label>
          <Select value={filters.tagId} onValueChange={(v) => updateFilter("tagId", v)}>
            <SelectTrigger id="tag">
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

        {/* Sort By */}
        <div className="min-w-[160px]">
          <Label htmlFor="sortBy">Sort By</Label>
          <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
            <SelectTrigger id="sortBy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="min-w-[120px]">
          <Label htmlFor="sortOrder">Order</Label>
          <Select
            value={filters.sortOrder}
            onValueChange={(v) => updateFilter("sortOrder", v as "asc" | "desc")}
          >
            <SelectTrigger id="sortOrder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} size="default">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
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
                      {factions.map((faction) => (
                        <SelectItem key={faction.id} value={faction.id}>
                          {faction.name}
                        </SelectItem>
                      ))}
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
                      {STATUS_OPTIONS.map((option) => (
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

                {/* Sort By */}
                <div>
                  <Label htmlFor="mobile-sortBy">Sort By</Label>
                  <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
                    <SelectTrigger id="mobile-sortBy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Label htmlFor="mobile-sortOrder">Order</Label>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(v) => updateFilter("sortOrder", v as "asc" | "desc")}
                  >
                    <SelectTrigger id="mobile-sortOrder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
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
        </div>
      )}
    </div>
  );
}
