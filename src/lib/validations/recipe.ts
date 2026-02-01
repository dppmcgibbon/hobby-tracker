import { z } from "zod";

export const recipeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(1000).optional().nullable(),
  faction_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .transform((val) => (val === "" || val === "none" ? null : val))
    .nullable(),
  is_public: z.boolean().default(false),
});

export const recipeStepSchema = z.object({
  paint_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .transform((val) => (val === "" || val === "none" ? null : val))
    .nullable(),
  technique: z.enum([
    "base",
    "layer",
    "shade",
    "wash",
    "drybrush",
    "highlight",
    "glaze",
    "blend",
    "edge_highlight",
    "stipple",
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export const createRecipeWithStepsSchema = z.object({
  recipe: recipeSchema,
  steps: z.array(recipeStepSchema).min(1, "At least one step is required"),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
export type RecipeStepInput = z.infer<typeof recipeStepSchema>;
export type CreateRecipeWithStepsInput = z.infer<typeof createRecipeWithStepsSchema>;
