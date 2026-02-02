import { z } from "zod";

export const stlFileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().max(1000).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  source_url: z.string().url("Invalid URL").optional().nullable(),
  designer: z.string().max(100).optional().nullable(),
  license: z.string().max(100).optional().nullable(),
  is_supported: z.boolean().default(false),
  scale_factor: z.coerce.number().min(0.1).max(10.0).default(1.0),
  estimated_print_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  estimated_material_usage_ml: z.coerce.number().min(0).optional().nullable(),
});

export const materialSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  type: z.enum(["resin", "filament", "powder"]),
  brand: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  quantity_ml: z.coerce.number().int().min(0).optional().nullable(),
  quantity_grams: z.coerce.number().int().min(0).optional().nullable(),
  cost_per_unit: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const printProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  material_id: z.string().uuid().optional().nullable(),
  printer_name: z.string().max(100).optional().nullable(),
  layer_height_mm: z.coerce.number().min(0.01).max(1.0).optional().nullable(),
  exposure_time_seconds: z.coerce.number().min(0).optional().nullable(),
  bottom_exposure_time_seconds: z.coerce.number().min(0).optional().nullable(),
  bottom_layers: z.coerce.number().int().min(0).optional().nullable(),
  lift_speed_mm_per_min: z.coerce.number().min(0).optional().nullable(),
  retract_speed_mm_per_min: z.coerce.number().min(0).optional().nullable(),
  temperature_celsius: z.coerce.number().int().min(-50).max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const printSchema = z.object({
  stl_file_id: z.string().uuid().optional().nullable(),
  miniature_id: z.string().uuid().optional().nullable(),
  material_id: z.string().uuid().optional().nullable(),
  print_profile_id: z.string().uuid().optional().nullable(),
  status: z.enum(["queued", "printing", "completed", "failed", "cancelled"]),
  quantity: z.coerce.number().int().min(1).default(1),
  scale_factor: z.coerce.number().min(0.1).max(10.0).default(1.0),
  print_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  material_used_ml: z.coerce.number().min(0).optional().nullable(),
  material_cost: z.coerce.number().min(0).optional().nullable(),
  failure_reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type StlFileInput = z.infer<typeof stlFileSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type PrintProfileInput = z.infer<typeof printProfileSchema>;
export type PrintInput = z.infer<typeof printSchema>;
