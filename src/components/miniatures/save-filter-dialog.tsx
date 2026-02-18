"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark } from "lucide-react";
import { saveFilter } from "@/app/actions/saved-filters";
import { toast } from "sonner";
import type { FilterState } from "./collection-filters";

interface SaveFilterDialogProps {
  currentFilters: FilterState;
}

export function SaveFilterDialog({ currentFilters }: SaveFilterDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if any filters are active
  const hasActiveFilters =
    currentFilters.search ||
    currentFilters.factionId !== "all" ||
    currentFilters.status !== "all" ||
    currentFilters.tagId !== "all" ||
    currentFilters.storageBoxId !== "all" ||
    currentFilters.universeId !== "all" ||
    currentFilters.gameId !== "all" ||
    currentFilters.editionId !== "all" ||
    currentFilters.expansionId !== "all" ||
    currentFilters.unitType !== "all" ||
    currentFilters.baseSize !== "all" ||
    currentFilters.hasPhotos !== "all" ||
    currentFilters.magnetised !== "all" ||
    currentFilters.based !== "all";

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this filter");
      return;
    }

    setIsLoading(true);
    try {
      await saveFilter(name, currentFilters as Record<string, string>, logoUrl || undefined);
      toast.success("Filter saved successfully!");
      setOpen(false);
      setName("");
      setLogoUrl("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save filter");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={!hasActiveFilters}
          title={hasActiveFilters ? "Save current filters" : "Apply some filters first"}
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Save Filters
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Filter Combination</DialogTitle>
          <DialogDescription>
            Give this filter combination a name so you can quickly access it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Filter Name</Label>
            <Input
              id="name"
              placeholder="e.g., Unpainted Warhammer 40K"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="logo-url">Logo URL (optional)</Label>
            <Input
              id="logo-url"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Paste an image URL to display as the shortcut icon
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Filter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
