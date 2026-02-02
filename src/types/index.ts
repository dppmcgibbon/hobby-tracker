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
export type Material = Tables<"materials">;
export type StlFile = Tables<"stl_files">;
export type PrintProfile = Tables<"print_profiles">;
export type Print = Tables<"prints">;
export type StlTag = Tables<"stl_tags">;
export type Game = Tables<"games">;
export type Edition = Tables<"editions">;
export type Expansion = Tables<"expansions">;
export type MiniatureGame = Tables<"miniature_games">;
