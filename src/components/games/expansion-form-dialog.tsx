"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { expansionSchema, type ExpansionInput } from "@/lib/validations/game";
import { createExpansion, updateExpansion } from "@/app/actions/games";
import { Loader2, Plus } from "lucide-react";
import type { Expansion } from "@/types";

interface ExpansionFormDialogProps {
  editionId: string;
  expansion?: Expansion;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ExpansionFormDialog({
  editionId,
  expansion,
  trigger,
  onSuccess,
}: ExpansionFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpansionInput>({
    resolver: zodResolver(expansionSchema) as Resolver<ExpansionInput>,
    defaultValues: {
      edition_id: editionId,
      name: expansion?.name || "",
      sequence: expansion?.sequence || 1,
      year: expansion?.year || undefined,
      description: expansion?.description || "",
    },
  });

  // When the dialog opens, reset form with latest expansion/edition data
  useEffect(() => {
    if (open) {
      form.reset({
        edition_id: editionId,
        name: expansion?.name || "",
        sequence: expansion?.sequence ?? 1,
        year: expansion?.year ?? undefined,
        description: expansion?.description || "",
      });
    }
  }, [open, editionId, expansion?.id, expansion?.name, expansion?.sequence, expansion?.year, expansion?.description]);

  const onSubmit = async (data: ExpansionInput) => {
    setIsLoading(true);
    try {
      if (expansion) {
        await updateExpansion(expansion.id, data);
        toast.success("Expansion updated successfully");
      } else {
        await createExpansion(data);
        toast.success("Expansion created successfully");
      }
      setOpen(false);
      form.reset();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save expansion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Expansion
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{expansion ? "Edit Expansion" : "Add New Expansion"}</DialogTitle>
          <DialogDescription>
            {expansion
              ? "Update the expansion details below."
              : "Add a new expansion to this edition."}
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
                      <Input placeholder="e.g., Starter Set" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sequence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2024" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the expansion..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {expansion ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
