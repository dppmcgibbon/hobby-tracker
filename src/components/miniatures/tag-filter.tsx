"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  matchMode: "any" | "all";
  onTagsChange: (tagIds: string[]) => void;
  onMatchModeChange: (mode: "any" | "all") => void;
}

export function TagFilter({
  tags,
  selectedTagIds,
  matchMode,
  onTagsChange,
  onMatchModeChange,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between flex-1"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {selectedTags.length > 0 ? (
                  <span>{selectedTags.length} tag(s) selected</span>
                ) : (
                  <span>Filter by tags...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <CommandItem key={tag.id} onSelect={() => toggleTag(tag.id)}>
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: tag.color || undefined,
                          color: tag.color || undefined,
                        }}
                        className="mr-2"
                      >
                        {tag.name}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearTags}>
            Clear
          </Button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{
                  borderColor: tag.color || undefined,
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <RadioGroup
            value={matchMode}
            onValueChange={(value) => onMatchModeChange(value as "any" | "all")}
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="match-any" />
                <Label htmlFor="match-any" className="font-normal cursor-pointer">
                  Match any tag
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="match-all" />
                <Label htmlFor="match-all" className="font-normal cursor-pointer">
                  Match all tags
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
