"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { materialSchema, type MaterialInput } from "@/lib/validations/stl";
import { createMaterial, updateMaterial } from "@/app/actions/materials";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaterialFormDialogProps {
  material?: {
    id: string;
    name: string;
    type: "resin" | "filament" | "powder";
    brand?: string | null;
    color?: string | null;
    color_hex?: string | null;
    quantity_ml?: number | null;
    quantity_grams?: number | null;
    cost_per_unit?: number | null;
    notes?: string | null;
  };
  trigger?: React.ReactNode;
}

export function MaterialFormDialog({ material, trigger }: MaterialFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MaterialInput>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: material?.name || "",
      type: material?.type || "resin",
      brand: material?.brand || "",
      color: material?.color || "",
      color_hex: material?.color_hex || "",
      quantity_ml: material?.quantity_ml || undefined,
      quantity_grams: material?.quantity_grams || undefined,
      cost_per_unit: material?.cost_per_unit || undefined,
      notes: material?.notes || "",
    },
  });

  const materialType = form.watch("type");

  const onSubmit = async (data: MaterialInput) => {
    setSubmitting(true);
    try {
      if (material?.id) {
        await updateMaterial(material.id, data);
        toast.success("Material updated successfully");
      } else {
        await createMaterial(data);
        toast.success("Material created successfully");
      }

      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Form error:", error);
      toast.error(material ? "Failed to update material" : "Failed to create material");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {material ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {material ? "Edit Material" : "Add Material"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "Edit Material" : "Add New Material"}</DialogTitle>
          <DialogDescription>
            {material ? "Update material details" : "Add a new resin, filament, or powder material"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Material name" {...field} disabled={submitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="resin">Resin</SelectItem>
                        <SelectItem value="filament">Filament</SelectItem>
                        <SelectItem value="powder">Powder</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brand name"
                        {...field}
                        value={field.value || ""}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Color name"
                        {...field}
                        value={field.value || ""}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color_hex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Hex</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="color"
                        className="w-20 h-10"
                        {...field}
                        value={field.value || "#808080"}
                        disabled={submitting}
                      />
                    </FormControl>
                    <Input
                      placeholder="#000000"
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={submitting}
                      className="flex-1"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {materialType === "resin" && (
                <FormField
                  control={form.control}
                  name="quantity_ml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (ml)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          {...field}
                          value={field.value || ""}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {materialType === "filament" && (
                <FormField
                  control={form.control}
                  name="quantity_grams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (grams)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          {...field}
                          value={field.value || ""}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per {materialType === "resin" ? "ml" : "gram"} ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.05"
                        {...field}
                        value={field.value || ""}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      {...field}
                      value={field.value || ""}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {material ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
