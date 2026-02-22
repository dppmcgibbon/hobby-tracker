"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { createRecipeWithStepsSchema } from "@/lib/validations/recipe";
import { createRecipe } from "@/app/actions/recipes";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { PaintSwatch } from "@/components/paints/paint-swatch";
import type { Paint, Faction } from "@/types";
import type { CreateRecipeWithStepsInput } from "@/lib/validations/recipe";

interface RecipeFormProps {
  paints: Paint[];
  factions: Faction[];
}

const techniques = [
  { value: "base", label: "Base Coat" },
  { value: "layer", label: "Layer" },
  { value: "shade", label: "Shade" },
  { value: "wash", label: "Wash" },
  { value: "drybrush", label: "Dry Brush" },
  { value: "highlight", label: "Highlight" },
  { value: "glaze", label: "Glaze" },
  { value: "blend", label: "Blend" },
  { value: "edge_highlight", label: "Edge Highlight" },
  { value: "stipple", label: "Stipple" },
];

export function RecipeForm({ paints, factions }: RecipeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<CreateRecipeWithStepsInput>({
    resolver: zodResolver(createRecipeWithStepsSchema) as Resolver<CreateRecipeWithStepsInput>,
    defaultValues: {
      recipe: {
        name: "",
        description: "",
        faction_id: "none",
        is_public: false,
      },
      steps: [{ paint_id: "none", technique: "base", notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "steps",
  });

  const onSubmit = async (data: CreateRecipeWithStepsInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createRecipe(data);
      router.push(`/dashboard/recipes/${result.recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recipe");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recipe Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              {...register("recipe.name")}
              placeholder="e.g., Ultramarines Blue Armor"
            />
            {errors.recipe?.name && (
              <p className="text-sm text-destructive">{errors.recipe.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("recipe.description")}
              placeholder="Describe your painting recipe..."
              rows={3}
            />
            {errors.recipe?.description && (
              <p className="text-sm text-destructive">{errors.recipe.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="faction_id">Faction (Optional)</Label>
            <Select
              onValueChange={(value) => setValue("recipe.faction_id", value)}
              defaultValue="none"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a faction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Faction</SelectItem>
                {factions.map((faction) => (
                  <SelectItem key={faction.id} value={faction.id}>
                    {faction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_public">Make Public</Label>
              <p className="text-sm text-muted-foreground">Allow other users to view this recipe</p>
            </div>
            <Switch
              id="is_public"
              onCheckedChange={(checked) => setValue("recipe.is_public", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Painting Steps</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ paint_id: "none", technique: "layer", notes: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Step {index + 1}</span>
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`steps.${index}.paint_id`}>Paint</Label>
                    <Select
                      onValueChange={(value) => setValue(`steps.${index}.paint_id`, value)}
                      defaultValue="none"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a paint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Paint (Optional)</SelectItem>
                        {paints.map((paint) => (
                          <SelectItem key={paint.id} value={paint.id}>
                            <div className="flex items-center gap-2">
                              <PaintSwatch
                                type={paint.type}
                                name={paint.name}
                                colorHex={paint.color_hex}
                                size="xs"
                                paintId={paint.id}
                                brand={paint.brand}
                              />
                              {paint.brand} - {paint.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.steps?.[index]?.paint_id && (
                      <p className="text-sm text-destructive">
                        {errors.steps[index]?.paint_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`steps.${index}.technique`}>Technique *</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          `steps.${index}.technique`,
                          value as
                            | "base"
                            | "layer"
                            | "shade"
                            | "wash"
                            | "drybrush"
                            | "highlight"
                            | "glaze"
                            | "blend"
                            | "edge_highlight"
                            | "stipple"
                        )
                      }
                      defaultValue={field.technique}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select technique" />
                      </SelectTrigger>
                      <SelectContent>
                        {techniques.map((tech) => (
                          <SelectItem key={tech.value} value={tech.value}>
                            {tech.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.steps?.[index]?.technique && (
                      <p className="text-sm text-destructive">
                        {errors.steps[index]?.technique?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`steps.${index}.notes`}>Notes</Label>
                  <Textarea
                    {...register(`steps.${index}.notes`)}
                    placeholder="Add any additional notes for this step..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {errors.steps && (
            <p className="text-sm text-destructive">
              {typeof errors.steps === "object" && "message" in errors.steps
                ? errors.steps.message
                : "Please fix the errors in the steps above"}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Recipe"}
        </Button>
      </div>
    </form>
  );
}
