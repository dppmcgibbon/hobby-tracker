import { z } from "zod";

export const miniatureSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  faction_id: z.string().uuid("Invalid faction").optional().nullable(),
  unit_type: z.string().max(50).optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  material: z.string().max(50).optional().nullable(),
  base_size: z.string().max(50).optional().nullable(),
  sculptor: z.string().max(100).optional().nullable(),
  year: z.coerce
    .number()
    .int()
    .min(1987, "Warhammer 40K started in 1987")
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const miniatureStatusSchema = z.object({
  status: z.enum(["backlog", "assembled", "primed", "painting", "completed"]),
  magnetised: z.boolean().default(false),
  based: z.boolean().default(false),
});

export type MiniatureInput = z.infer<typeof miniatureSchema>;
export type MiniatureStatusInput = z.infer<typeof miniatureStatusSchema>;
