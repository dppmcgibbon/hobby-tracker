"use client";

import { useState, useTransition } from "react";
import { HexColorPicker } from "react-colorful";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createTag,
  deleteTag,
  addTagToMiniature,
  removeTagFromMiniature,
} from "@/app/actions/tags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagManagerProps {
  tags: Tag[];
  miniatureId?: string;
  selectedTags?: string[];
  onTagsUpdated?: () => void;
}

export function TagManager({
  tags,
  miniatureId,
  selectedTags = [],
  onTagsUpdated,
}: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [isPending, startTransition] = useTransition();

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    startTransition(async () => {
      try {
        await createTag({ name: newTagName, color: newTagColor });
        toast.success("Tag created successfully");
        setNewTagName("");
        setNewTagColor("#3b82f6");
        setIsOpen(false);
        onTagsUpdated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create tag");
      }
    });
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    startTransition(async () => {
      try {
        await deleteTag(tagId);
        toast.success("Tag deleted");
        onTagsUpdated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete tag");
      }
    });
  };

  const handleToggleTag = async (tagId: string) => {
    if (!miniatureId) return;

    const isSelected = selectedTags.includes(tagId);
    startTransition(async () => {
      try {
        if (isSelected) {
          await removeTagFromMiniature(miniatureId, tagId);
          toast.success("Tag removed");
        } else {
          await addTagToMiniature(miniatureId, tagId);
          toast.success("Tag added");
        }
        onTagsUpdated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update tag");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tags</Label>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., WIP, Completed, Tournament Ready"
                  maxLength={50}
                  required
                />
              </div>
              <div>
                <Label>Tag Color</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-12 h-12 rounded-md border-2 border-gray-300"
                        style={{ backgroundColor: newTagColor }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker color={newTagColor} onChange={setNewTagColor} />
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    placeholder="#3b82f6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                Create Tag
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet. Create one to get started.</p>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <div key={tag.id} className="group relative">
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer pr-8"
                  style={{
                    backgroundColor: isSelected && tag.color ? tag.color : undefined,
                    borderColor: tag.color || undefined,
                    color: isSelected && tag.color ? "#ffffff" : undefined,
                  }}
                  onClick={() => miniatureId && handleToggleTag(tag.id)}
                >
                  <TagIcon className="mr-1 h-3 w-3" />
                  {tag.name}
                </Badge>
                {!miniatureId && (
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
