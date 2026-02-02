import { z } from "zod";

export const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color")
    .optional()
    .nullable(),
});

export const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(100, "Name too long"),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color")
    .optional()
    .nullable(),
});

export type TagInput = z.infer<typeof tagSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
