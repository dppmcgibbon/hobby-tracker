"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Tag, FolderPlus, X } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateStatus, bulkDelete } from "@/app/actions/miniatures";
import { bulkAddTags } from "@/app/actions/tags";
import { addMiniaturesToCollection } from "@/app/actions/collections";
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

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Collection {
  id: string;
  name: string;
}

interface BatchOperationsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  tags: Tag[];
  collections: Collection[];
}

export function BatchOperationsBar({
  selectedIds,
  onClearSelection,
  tags,
  collections,
}: BatchOperationsBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

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
