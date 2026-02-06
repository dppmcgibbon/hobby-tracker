"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { miniatureSchema, type MiniatureInput } from "@/lib/validations/miniature";
import { createMiniature, updateMiniature } from "@/app/actions/miniatures";
import { linkRecipeToMiniature, unlinkRecipeFromMiniature } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { RecipeSelector } from "@/components/recipes/recipe-selector";
import type { Faction, Miniature } from "@/types";
import { toast } from "sonner";

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

interface Base {
  id: string;
  name: string;
}

interface BaseShape {
  id: string;
  name: string;
}

interface BaseType {
  id: string;
  name: string;
}

interface MiniatureFormProps {
  factions: Faction[];
  storageBoxes?: StorageBox[];
  recipes?: Recipe[];
  bases?: Base[];
  baseShapes?: BaseShape[];
  baseTypes?: BaseType[];
  existingRecipeIds?: string[];
  miniature?: Miniature;
  onSuccess?: () => void;
}

export function MiniatureForm({
  factions,
  storageBoxes = [],
  recipes = [],
  bases = [],
  baseShapes = [],
  baseTypes = [],
  existingRecipeIds = [],
  miniature,
  onSuccess,
}: MiniatureFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>(existingRecipeIds);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MiniatureInput>({
    resolver: zodResolver(miniatureSchema),
    defaultValues: miniature
      ? {
          name: miniature.name,
          faction_id: miniature.faction_id || undefined,
          unit_type: miniature.unit_type || undefined,
          quantity: miniature.quantity,
          material: miniature.material || undefined,
          base_size: miniature.base_size || undefined,
          base_id: (miniature as any).base_id || undefined,
          base_shape_id: (miniature as any).base_shape_id || undefined,
          base_type_id: (miniature as any).base_type_id || undefined,
          sculptor: miniature.sculptor || undefined,
          year: miniature.year || undefined,
          notes: miniature.notes || undefined,
          storage_box_id: (miniature as any).storage_box_id || undefined,
        }
      : {
          quantity: 1,
          sculptor: "Unknown",
        },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const factionId = watch("faction_id");
  // eslint-disable-next-line react-hooks/incompatible-library
  const storageBoxId = watch("storage_box_id");
  // eslint-disable-next-line react-hooks/incompatible-library
  const baseId = watch("base_id");
  // eslint-disable-next-line react-hooks/incompatible-library
  const baseShapeId = watch("base_shape_id");
  // eslint-disable-next-line react-hooks/incompatible-library
  const baseTypeId = watch("base_type_id");

  const onSubmit = async (data: MiniatureInput) => {
    setIsLoading(true);
    setError(null);

    try {
      let miniatureId: string;
      
      if (miniature) {
        const result = await updateMiniature(miniature.id, data);
        miniatureId = miniature.id;
      } else {
        const result = await createMiniature(data);
        miniatureId = result.miniature.id;
      }

      // Handle recipe linking for new miniatures or changed recipes for existing ones
      if (miniature) {
        // For existing miniatures, handle both adding and removing recipes
        const newRecipeIds = selectedRecipeIds.filter((id) => !existingRecipeIds.includes(id));
        const removedRecipeIds = existingRecipeIds.filter((id) => !selectedRecipeIds.includes(id));
        
        // Link new recipes
        for (const recipeId of newRecipeIds) {
          try {
            await linkRecipeToMiniature(miniatureId, recipeId);
          } catch (err) {
            console.error("Failed to link recipe:", err);
            toast.error(`Failed to link recipe ${recipeId}`);
          }
        }
        
        // Unlink removed recipes
        for (const recipeId of removedRecipeIds) {
          try {
            await unlinkRecipeFromMiniature(miniatureId, recipeId);
          } catch (err) {
            console.error("Failed to unlink recipe:", err);
            toast.error(`Failed to unlink recipe ${recipeId}`);
          }
        }
      } else if (selectedRecipeIds.length > 0) {
        // For new miniatures, only link selected recipes
        for (const recipeId of selectedRecipeIds) {
          try {
            await linkRecipeToMiniature(miniatureId, recipeId);
          } catch (err) {
            console.error("Failed to link recipe:", err);
            toast.error(`Failed to link recipe ${recipeId}`);
          }
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/collection");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Primaris Intercessor Squad"
          {...register("name")}
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="faction_id">Faction</Label>
          <Select
            value={factionId || ""}
            onValueChange={(value) => setValue("faction_id", value || null)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a faction" />
            </SelectTrigger>
            <SelectContent>
              {factions.map((faction) => (
                <SelectItem key={faction.id} value={faction.id}>
                  {faction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.faction_id && (
            <p className="text-sm text-destructive">{errors.faction_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="storage_box_id">Storage Location</Label>
          <Select
            value={storageBoxId || "none"}
            onValueChange={(value) => setValue("storage_box_id", value === "none" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select storage box" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No storage box</SelectItem>
              {storageBoxes.map((box) => (
                <SelectItem key={box.id} value={box.id}>
                  {box.name}
                  {box.location && ` (${box.location})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.storage_box_id && (
            <p className="text-sm text-destructive">{errors.storage_box_id.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit_type">Unit Type</Label>
        <Input
          id="unit_type"
          placeholder="e.g., Troops, HQ, Elites"
          {...register("unit_type")}
          disabled={isLoading}
        />
        {errors.unit_type && (
          <p className="text-sm text-destructive">{errors.unit_type.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            {...register("quantity")}
            disabled={isLoading}
          />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            placeholder="e.g., Plastic, Resin"
            {...register("material")}
            disabled={isLoading}
          />
          {errors.material && <p className="text-sm text-destructive">{errors.material.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_id">Base</Label>
          <Select
            value={baseId || "none"}
            onValueChange={(value) => setValue("base_id", value === "none" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select base" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No base</SelectItem>
              {bases.map((base) => (
                <SelectItem key={base.id} value={base.id}>
                  {base.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.base_id && (
            <p className="text-sm text-destructive">{errors.base_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_shape_id">Base Shape</Label>
          <Select
            value={baseShapeId || "none"}
            onValueChange={(value) => setValue("base_shape_id", value === "none" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No shape</SelectItem>
              {baseShapes.map((shape) => (
                <SelectItem key={shape.id} value={shape.id}>
                  {shape.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.base_shape_id && (
            <p className="text-sm text-destructive">{errors.base_shape_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_type_id">Base Type</Label>
          <Select
            value={baseTypeId || "none"}
            onValueChange={(value) => setValue("base_type_id", value === "none" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No type</SelectItem>
              {baseTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.base_type_id && (
            <p className="text-sm text-destructive">{errors.base_type_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sculptor">Sculptor</Label>
          <Input
            id="sculptor"
            placeholder="Sculptor name"
            {...register("sculptor")}
            disabled={isLoading}
          />
          {errors.sculptor && <p className="text-sm text-destructive">{errors.sculptor.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min="1987"
            max={new Date().getFullYear()}
            placeholder={new Date().getFullYear().toString()}
            {...register("year")}
            disabled={isLoading}
          />
          {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this miniature..."
          rows={4}
          {...register("notes")}
          disabled={isLoading}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      {recipes.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="recipes">Painting Recipes</Label>
          <RecipeSelector
            recipes={recipes}
            selectedRecipeIds={selectedRecipeIds}
            onSelectionChange={setSelectedRecipeIds}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Select painting recipes to link to this miniature
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {miniature ? "Update" : "Create"} Miniature
        </Button>
      </div>
    </form>
  );
}
