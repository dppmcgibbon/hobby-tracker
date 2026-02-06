"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateStorageBox, deleteStorageBox } from "@/app/actions/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const storageBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

type StorageBoxInput = z.infer<typeof storageBoxSchema>;

interface EditStorageBoxFormProps {
  storageBox: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
  };
}

export default function EditStorageBoxForm({ storageBox }: EditStorageBoxFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StorageBoxInput>({
    resolver: zodResolver(storageBoxSchema),
    defaultValues: {
      name: storageBox.name,
      location: storageBox.location || "",
      description: storageBox.description || "",
    },
  });

  const onSubmit = async (data: StorageBoxInput) => {
    setIsSubmitting(true);
    try {
      await updateStorageBox(storageBox.id, data);
      toast.success("Storage box updated successfully!");
      router.push("/dashboard/storage");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update storage box");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteStorageBox(storageBox.id);
      toast.success("Storage box deleted successfully!");
      router.push("/dashboard/storage");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete storage box");
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/storage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Storage
          </Link>
        </Button>
      </div>

      <Card className="warhammer-card border-primary/30">
        <CardHeader className="border-b border-primary/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl uppercase tracking-wide text-primary gold-glow">
              Edit Storage Box
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Storage Box?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{storageBox.name}". Miniatures stored in this box
                    will be unlinked but not deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="uppercase text-xs tracking-wide font-bold">
                Box Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Box A, Shelf 1, etc."
                {...register("name")}
                className="bg-muted/30 border-primary/20 focus:border-primary"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="uppercase text-xs tracking-wide font-bold">
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., Garage shelf, Closet top shelf, etc."
                {...register("location")}
                className="bg-muted/30 border-primary/20 focus:border-primary"
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="uppercase text-xs tracking-wide font-bold">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Notes about this storage box..."
                rows={4}
                {...register("description")}
                className="bg-muted/30 border-primary/20 focus:border-primary"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting} className="btn-warhammer-primary flex-1">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
