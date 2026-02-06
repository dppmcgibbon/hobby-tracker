"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipe {
  id: string;
  name: string;
  faction?: { name: string } | null;
}

interface RecipeSelectorProps {
  recipes: Recipe[];
  selectedRecipeIds: string[];
  onSelectionChange: (recipeIds: string[]) => void;
  disabled?: boolean;
}

export function RecipeSelector({
  recipes,
  selectedRecipeIds,
  onSelectionChange,
  disabled,
}: RecipeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedRecipes = recipes.filter((r) => selectedRecipeIds.includes(r.id));

  const toggleRecipe = (recipeId: string) => {
    if (selectedRecipeIds.includes(recipeId)) {
      onSelectionChange(selectedRecipeIds.filter((id) => id !== recipeId));
    } else {
      onSelectionChange([...selectedRecipeIds, recipeId]);
    }
  };

  const removeRecipe = (recipeId: string) => {
    onSelectionChange(selectedRecipeIds.filter((id) => id !== recipeId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedRecipeIds.length > 0
              ? `${selectedRecipeIds.length} recipe(s) selected`
              : "Select recipes..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search recipes..." />
            <CommandEmpty>No recipes found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {recipes.map((recipe) => (
                <CommandItem
                  key={recipe.id}
                  value={recipe.name}
                  onSelect={() => toggleRecipe(recipe.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedRecipeIds.includes(recipe.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{recipe.name}</div>
                    {recipe.faction && (
                      <div className="text-xs text-muted-foreground">{recipe.faction.name}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRecipes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRecipes.map((recipe) => (
            <Badge key={recipe.id} variant="secondary" className="gap-1">
              {recipe.name}
              <button
                type="button"
                onClick={() => removeRecipe(recipe.id)}
                className="ml-1 hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
