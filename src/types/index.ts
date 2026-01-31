export type { Database } from "./database";
import type { Database } from "./database";

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience types
export type Profile = Tables<"profiles">;
export type Faction = Tables<"factions">;
export type Miniature = Tables<"miniatures">;
export type MiniatureStatus = Tables<"miniature_status">;
export type Paint = Tables<"paints">;
export type PaintingRecipe = Tables<"painting_recipes">;
export type RecipeStep = Tables<"recipe_steps">;
export type MiniaturePhoto = Tables<"miniature_photos">;
export type UserPaint = Tables<"user_paints">;