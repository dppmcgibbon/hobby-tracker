import { z } from "zod";

export const gameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(1000).optional().nullable(),
  publisher: z.string().max(100).optional().nullable(),
});

export const editionSchema = z.object({
  game_id: z.string().uuid("Invalid game ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  sequence: z.coerce.number().int().min(1, "Sequence must be at least 1"),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export const expansionSchema = z.object({
  edition_id: z.string().uuid("Invalid edition ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  sequence: z.coerce.number().int().min(1, "Sequence must be at least 1"),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export const miniatureGameSchema = z.object({
  miniature_id: z.string().uuid("Invalid miniature ID"),
  game_id: z.string().uuid("Invalid game ID"),
  edition_id: z.string().uuid().optional().nullable(),
  expansion_id: z.string().uuid().optional().nullable(),
});

export type GameInput = z.infer<typeof gameSchema>;
export type EditionInput = z.infer<typeof editionSchema>;
export type ExpansionInput = z.infer<typeof expansionSchema>;
export type MiniatureGameInput = z.infer<typeof miniatureGameSchema>;
