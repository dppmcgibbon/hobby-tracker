"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { addStlTag, removeStlTag } from "@/app/actions/stl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface StlTagManagerProps {
  stlFileId: string;
  currentTags: Array<{
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  availableTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export function StlTagManager({ stlFileId, currentTags, availableTags }: StlTagManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentTagIds = currentTags.map((t) => t.tag_id);
  const unassignedTags = availableTags.filter((tag) => !currentTagIds.includes(tag.id));

  const handleAddTag = async (tagId: string) => {
    setLoading(true);
    try {
      await addStlTag(stlFileId, tagId);
      toast.success("Tag added");
      router.refresh();
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      await removeStlTag(stlFileId, tagId);
      toast.success("Tag removed");
      router.refresh();
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Tags</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tags</DialogTitle>
              <DialogDescription>Select tags to add to this STL file</DialogDescription>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {unassignedTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">
                      All tags are already assigned
                    </p>
                  ) : (
                    unassignedTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          handleAddTag(tag.id);
                          setOpen(false);
                        }}
                        disabled={loading}
                      >
                        <Tag className="mr-2 h-4 w-4" style={{ color: tag.color }} />
                        <span>{tag.name}</span>
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>

      {currentTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags assigned</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tagRelation) => (
            <Badge
              key={tagRelation.tag_id}
              style={{ backgroundColor: tagRelation.tags.color }}
              className="text-white pr-1"
            >
              {tagRelation.tags.name}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveTag(tagRelation.tag_id)}
                disabled={loading}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
