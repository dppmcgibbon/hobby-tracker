"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Tag, FolderPlus, X, Gamepad2, Archive, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateStatus, bulkDelete, bulkUpdateStorageBox } from "@/app/actions/miniatures";
import { bulkAddTags } from "@/app/actions/tags";
import { addMiniaturesToCollection } from "@/app/actions/collections";
import { bulkLinkMinaturesToGame } from "@/app/actions/games";
import { bulkLinkRecipes } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { RecipeSelector } from "@/components/recipes/recipe-selector";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Collection {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
}

interface Edition {
  id: string;
  name: string;
  year: number | null;
}

interface Expansion {
  id: string;
  name: string;
  year: number | null;
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

interface BatchOperationsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  tags: Tag[];
  collections: Collection[];
  storageBoxes?: StorageBox[];
  recipes?: Recipe[];
  games?: Game[];
  editions?: Edition[];
  expansions?: Expansion[];
}

export function BatchOperationsBar({
  selectedIds,
  onClearSelection,
  tags,
  collections,
  storageBoxes = [],
  recipes = [],
  games = [],
  editions = [],
  expansions = [],
}: BatchOperationsBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedStorageBoxId, setSelectedStorageBoxId] = useState<string>("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const [selectedExpansionId, setSelectedExpansionId] = useState<string>("");
  const [availableEditions, setAvailableEditions] = useState<Edition[]>([]);
  const [availableExpansions, setAvailableExpansions] = useState<Expansion[]>([]);

  // Fetch editions when game is selected
  useEffect(() => {
    if (selectedGameId) {
      console.log("Fetching editions for game:", selectedGameId);
      supabase
        .from("editions")
        .select("id, name, year")
        .eq("game_id", selectedGameId)
        .order("sequence")
        .then(({ data, error }) => {
          console.log("Editions fetched:", { data, error, count: data?.length });
          setAvailableEditions(data || []);
          // Initialize edition selection
          if (!selectedEditionId) {
            setSelectedEditionId("none");
          }
        });
    } else {
      console.log("Clearing editions");
      setAvailableEditions([]);
      setSelectedEditionId("none");
    }
  }, [selectedGameId, supabase]);

  // Fetch expansions when edition is selected
  useEffect(() => {
    if (selectedEditionId && selectedEditionId !== "none") {
      console.log("Fetching expansions for edition:", selectedEditionId);
      supabase
        .from("expansions")
        .select("id, name, year")
        .eq("edition_id", selectedEditionId)
        .order("sequence")
        .then(({ data, error }) => {
          console.log("Expansions fetched:", { data, error, count: data?.length });
          setAvailableExpansions(data || []);
          // Initialize expansion selection
          if (!selectedExpansionId) {
            setSelectedExpansionId("none");
          }
        });
    } else {
      console.log("Clearing expansions, selectedEditionId:", selectedEditionId);
      setAvailableExpansions([]);
      setSelectedExpansionId("none");
    }
  }, [selectedEditionId, supabase]);

  if (selectedIds.length === 0) return null;

  const handleUpdateStatus = () => {
    if (!selectedStatus) return;

    startTransition(async () => {
      try {
        await bulkUpdateStatus(selectedIds, selectedStatus);
        toast.success(`Updated ${selectedIds.length} miniature(s)`);
        onClearSelection();
        setSelectedStatus("");
        router.refresh(); // Force refresh to show updated status
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update status");
      }
    });
  };

  const handleAddTag = () => {
    if (!selectedTagId) return;

    startTransition(async () => {
      try {
        const result = await bulkAddTags(selectedIds, selectedTagId);

        // Show appropriate message based on result
        if (result.message) {
          toast.success(result.message);
        } else {
          toast.success(`Tagged ${selectedIds.length} miniature(s)`);
        }

        onClearSelection();
        setSelectedTagId("");
        router.refresh(); // Force refresh to show tags
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add tags");
      }
    });
  };

  const handleAddToCollection = () => {
    if (!selectedCollectionId) return;

    startTransition(async () => {
      try {
        await addMiniaturesToCollection(selectedCollectionId, selectedIds);
        toast.success(`Added ${selectedIds.length} miniature(s) to collection`);
        onClearSelection();
        setSelectedCollectionId("");
        router.refresh(); // Force refresh
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add to collection");
      }
    });
  };

  const handleUpdateStorageBox = () => {
    startTransition(async () => {
      try {
        await bulkUpdateStorageBox(
          selectedIds,
          selectedStorageBoxId === "none" ? null : selectedStorageBoxId || null
        );
        toast.success(`Updated storage location for ${selectedIds.length} miniature(s)`);
        onClearSelection();
        setSelectedStorageBoxId("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update storage location");
      }
    });
  };

  const handleLinkRecipes = () => {
    if (selectedRecipeIds.length === 0) return;

    startTransition(async () => {
      try {
        await bulkLinkRecipes(selectedIds, selectedRecipeIds);
        toast.success(`Linked ${selectedRecipeIds.length} recipe(s) to ${selectedIds.length} miniature(s)`);
        onClearSelection();
        setSelectedRecipeIds([]);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to link recipes");
      }
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDelete(selectedIds);
        toast.success(`Deleted ${selectedIds.length} miniature(s)`);
        onClearSelection();
        router.refresh(); // Force refresh to remove deleted items
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete");
      }
    });
  };

  const handleLinkGame = () => {
    if (!selectedGameId) return;

    startTransition(async () => {
      try {
        await bulkLinkMinaturesToGame(
          selectedIds,
          selectedGameId,
          selectedEditionId && selectedEditionId !== "none" ? selectedEditionId : null,
          selectedExpansionId && selectedExpansionId !== "none" ? selectedExpansionId : null
        );
        toast.success(`Linked ${selectedIds.length} miniature(s) to game`);
        onClearSelection();
        setSelectedGameId("");
        setSelectedEditionId("");
        setSelectedExpansionId("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to link game");
      }
    });
  };

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-2xl">
      <div className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span className="font-medium">{selectedIds.length} selected</span>
        </div>

        <div className="h-8 w-px bg-border" />

        {/* Status Update */}
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Update status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="assembled">Assembled</SelectItem>
              <SelectItem value="primed">Primed</SelectItem>
              <SelectItem value="painting">Painting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleUpdateStatus} disabled={!selectedStatus || isPending}>
            Apply
          </Button>
        </div>

        {/* Add Tag */}
        <div className="flex items-center gap-2">
          <Select value={selectedTagId} onValueChange={setSelectedTagId}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Add tag..." />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddTag} disabled={!selectedTagId || isPending}>
            <Tag className="h-4 w-4" />
          </Button>
        </div>

        {/* Add to Collection */}
        <div className="flex items-center gap-2">
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Add to collection..." />
            </SelectTrigger>
            <SelectContent>
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAddToCollection}
            disabled={!selectedCollectionId || isPending}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>

        {/* Update Storage Box */}
        {storageBoxes.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedStorageBoxId} onValueChange={setSelectedStorageBoxId}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Set storage..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No storage box</SelectItem>
                {storageBoxes.map((box) => (
                  <SelectItem key={box.id} value={box.id}>
                    {box.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleUpdateStorageBox}
              disabled={!selectedStorageBoxId || isPending}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Link Recipes */}
        {recipes.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-[200px]">
              <RecipeSelector
                recipes={recipes}
                selectedRecipeIds={selectedRecipeIds}
                onSelectionChange={setSelectedRecipeIds}
                disabled={isPending}
              />
            </div>
            <Button
              size="sm"
              onClick={handleLinkRecipes}
              disabled={selectedRecipeIds.length === 0 || isPending}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Link to Game */}
        {games.length > 0 && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Select
                value={selectedGameId}
                onValueChange={(v) => {
                  setSelectedGameId(v);
                  setSelectedEditionId("");
                  setSelectedExpansionId("");
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Link to game..." />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Edition selector - only show if game selected */}
              {selectedGameId && availableEditions.length > 0 && (
                <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Edition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No edition</SelectItem>
                    {availableEditions.map((edition) => (
                      <SelectItem key={edition.id} value={edition.id}>
                        {edition.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Expansion selector - only show if edition selected */}
              {selectedEditionId && selectedEditionId !== "none" && (
                <Select value={selectedExpansionId} onValueChange={setSelectedExpansionId}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Expansion..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No expansion</SelectItem>
                    {availableExpansions.map((expansion) => (
                      <SelectItem key={expansion.id} value={expansion.id}>
                        {expansion.name}
                      </SelectItem>
                    ))}
                    {availableExpansions.length === 0 && (
                      <SelectItem value="none" disabled>
                        No expansions available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}

              <Button size="sm" onClick={handleLinkGame} disabled={!selectedGameId || isPending}>
                <Gamepad2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        <div className="h-8 w-px bg-border" />

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} miniature(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected miniatures
                and all associated photos and data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Selection */}
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
