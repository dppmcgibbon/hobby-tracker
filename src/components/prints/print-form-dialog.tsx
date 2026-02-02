"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { printSchema, type PrintInput } from "@/lib/validations/stl";
import { createPrint } from "@/app/actions/prints";
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

interface PrintFormDialogProps {
  stlFiles: Array<{ id: string; name: string }>;
  materials: Array<{ id: string; name: string; type: string }>;
  miniatures?: Array<{ id: string; name: string }>;
  defaultStlFileId?: string;
  defaultMiniatureId?: string;
}

export function PrintFormDialog({
  stlFiles,
  materials,
  miniatures,
  defaultStlFileId,
  defaultMiniatureId,
}: PrintFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PrintInput>({
    resolver: zodResolver(printSchema),
    defaultValues: {
      stl_file_id: defaultStlFileId || undefined,
      miniature_id: defaultMiniatureId || undefined,
      material_id: undefined,
      status: "queued",
      quantity: 1,
      scale_factor: 1.0,
    },
  });

  const onSubmit = async (data: PrintInput) => {
    setSubmitting(true);
    try {
      await createPrint(data);
      toast.success("Print job created successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Form error:", error);
      toast.error("Failed to create print job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Print Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Print Job</DialogTitle>
          <DialogDescription>Add a new print to your queue</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stl_file_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>STL File</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                    disabled={submitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select STL file" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stlFiles.map((stl) => (
                        <SelectItem key={stl.id} value={stl.id}>
                          {stl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {miniatures && miniatures.length > 0 && (
              <FormField
                control={form.control}
                name="miniature_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Miniature (optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select miniature" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {miniatures.map((mini) => (
                          <SelectItem key={mini.id} value={mini.id}>
                            {mini.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                    disabled={submitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scale_factor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scale Factor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        placeholder="1.0"
                        {...field}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="print_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Time (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="120"
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
                name="material_used_ml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Used (ml)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="15"
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
                      placeholder="Print notes..."
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
                Create Print Job
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
