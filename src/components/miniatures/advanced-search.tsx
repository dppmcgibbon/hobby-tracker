"use client";

import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useMiniatureFilters } from "@/lib/hooks/use-miniature-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TagFilter } from "./tag-filter";

interface Faction {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface AdvancedSearchProps {
  factions: Faction[];
  tags: Tag[];
}

const STATUS_OPTIONS = [
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

export function AdvancedSearch({ factions, tags }: AdvancedSearchProps) {
  const { filters, updateFilters, clearFilters } = useMiniatureFilters();
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount =
    filters.factionIds.length +
    filters.statuses.length +
    filters.tagIds.length +
    (filters.search ? 1 : 0);

  const handleFactionToggle = (factionId: string) => {
    const newFactions = filters.factionIds.includes(factionId)
      ? filters.factionIds.filter((id) => id !== factionId)
      : [...filters.factionIds, factionId];
    updateFilters({ factionIds: newFactions });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: newStatuses });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search miniatures..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-5 min-w-5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Sort Options */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) =>
                      updateFilters({ sortBy: value as MiniatureFilters["sortBy"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="created">Date Created</SelectItem>
                      <SelectItem value="updated">Last Updated</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value) => updateFilters({ sortOrder: value as "asc" | "desc" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Factions */}
              <div className="space-y-2">
                <Label>Factions</Label>
                <div className="flex flex-wrap gap-2">
                  {factions.map((faction) => (
                    <Badge
                      key={faction.id}
                      variant={filters.factionIds.includes(faction.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleFactionToggle(faction.id)}
                    >
                      {faction.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <Badge
                      key={status.value}
                      variant={filters.statuses.includes(status.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleStatusToggle(status.value)}
                    >
                      {status.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <TagFilter
                  tags={tags}
                  selectedTagIds={filters.tagIds}
                  matchMode={filters.tagMatchMode}
                  onTagsChange={(tagIds) => updateFilters({ tagIds })}
                  onMatchModeChange={(mode) => updateFilters({ tagMatchMode: mode })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary">
              Search: {filters.search}
              <button className="ml-1" onClick={() => updateFilters({ search: "" })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.factionIds.map((id) => {
            const faction = factions.find((f) => f.id === id);
            return faction ? (
              <Badge key={id} variant="secondary">
                {faction.name}
                <button className="ml-1" onClick={() => handleFactionToggle(id)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {filters.statuses.map((status) => {
            const statusObj = STATUS_OPTIONS.find((s) => s.value === status);
            return statusObj ? (
              <Badge key={status} variant="secondary">
                {statusObj.label}
                <button className="ml-1" onClick={() => handleStatusToggle(status)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {filters.tagIds.map((id) => {
            const tag = tags.find((t) => t.id === id);
            return tag ? (
              <Badge key={id} variant="secondary" style={{ borderColor: tag.color || undefined }}>
                {tag.name}
                <button
                  className="ml-1"
                  onClick={() =>
                    updateFilters({ tagIds: filters.tagIds.filter((tid) => tid !== id) })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
