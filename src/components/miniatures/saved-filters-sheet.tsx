"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon, Star, Trash2 } from "lucide-react";
import { toggleStarFilter, deleteFilter } from "@/app/actions/saved-filters";
import { toast } from "sonner";

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
  logo_url?: string | null;
  is_starred: boolean;
}

interface SavedFiltersSheetProps {
  savedFilters: SavedFilter[];
}

export function SavedFiltersSheet({ savedFilters }: SavedFiltersSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleToggleStar = async (filterId: string, currentStarred: boolean) => {
    try {
      await toggleStarFilter(filterId, !currentStarred);
      toast.success(currentStarred ? "Removed from shortcuts" : "Added to shortcuts");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update filter");
    }
  };

  const handleDelete = async (filterId: string) => {
    if (!confirm("Are you sure you want to delete this saved filter?")) {
      return;
    }

    try {
      await deleteFilter(filterId);
      toast.success("Filter deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete filter");
    }
  };

  const handleLoadFilter = (filters: Record<string, string>) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      }
    });

    router.push(`/dashboard/miniatures?${params.toString()}`);
    setOpen(false);
  };

  const getActiveFilterCount = (filters: Record<string, string>) => {
    return Object.entries(filters).filter(
      ([key, value]) => value && value !== "all" && value !== ""
    ).length;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="default">
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Saved Filters
          {savedFilters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {savedFilters.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Saved Filters</SheetTitle>
          <SheetDescription>
            Quickly access your saved filter combinations
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {savedFilters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookmarkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved filters yet</p>
              <p className="text-sm mt-2">
                Apply some filters and save them for quick access
              </p>
            </div>
          ) : (
            savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="p-3 rounded-sm border border-primary/20 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    onClick={() => handleLoadFilter(filter.filters)}
                    className="flex-1 text-left group"
                  >
                    <p className="font-semibold group-hover:text-primary transition-colors">
                      {filter.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getActiveFilterCount(filter.filters)} filter
                      {getActiveFilterCount(filter.filters) !== 1 ? "s" : ""} applied
                    </p>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleStar(filter.id, filter.is_starred)}
                      title={filter.is_starred ? "Remove from shortcuts" : "Add to shortcuts"}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          filter.is_starred ? "fill-primary text-primary" : ""
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => handleDelete(filter.id)}
                      title="Delete filter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
