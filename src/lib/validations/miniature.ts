import { z } from "zod";

export const miniatureSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  faction_id: z.string().uuid("Invalid faction").optional().nullable(),
  unit_type: z.string().max(50).optional().nullable(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").default(1),
  material: z.string().max(50).optional().nullable(),
  base_size: z.string().max(50).optional().nullable(),
  base_id: z.string().uuid("Invalid base").optional().nullable(),
  base_shape_id: z.string().uuid("Invalid base shape").optional().nullable(),
  base_type_id: z.string().uuid("Invalid base type").optional().nullable(),
  sculptor: z.string().max(100).optional().nullable(),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
  storage_box_id: z.string().uuid("Invalid storage box").optional().nullable(),
  // Status fields (edit/add pages; stored in miniature_status)
  status: z.enum([
    "unknown",
    "missing",
    "needs_stripped",
    "backlog",
    "built",
    "primed",
    "painting_started",
    "needs_repair",
    "sub_assembled",
    "missing_arm",
    "missing_leg",
    "missing_head",
    "complete",
  ]).optional(),
  magnetised: z.boolean().optional(),
  based: z.boolean().optional(),
});

export const miniatureStatusSchema = z.object({
  status: z.enum([
    "unknown",
    "missing",
    "needs_stripped",
    "backlog",
    "built",
    "primed",
    "painting_started",
    "needs_repair",
    "sub_assembled",
    "missing_arm",
    "missing_leg",
    "missing_head",
    "complete",
  ]),
  magnetised: z.boolean().default(false),
  based: z.boolean().default(false),
});

export type MiniatureInput = z.infer<typeof miniatureSchema>;
export type MiniatureStatusInput = z.infer<typeof miniatureStatusSchema>;
