import { z } from "zod";

export const addPaintToInventorySchema = z.object({
  paint_id: z.string().uuid("Invalid paint"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  notes: z.string().max(500).optional().nullable(),
});

export const updatePaintInventorySchema = z.object({
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  notes: z.string().max(500).optional().nullable(),
});

export type AddPaintToInventoryInput = z.infer<typeof addPaintToInventorySchema>;
export type UpdatePaintInventoryInput = z.infer<typeof updatePaintInventorySchema>;
