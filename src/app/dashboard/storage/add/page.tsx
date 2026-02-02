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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createStorageBox } from "@/app/actions/storage";

const storageBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

type StorageBoxInput = z.infer<typeof storageBoxSchema>;

export default function AddStorageBoxPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StorageBoxInput>({
    resolver: zodResolver(storageBoxSchema),
  });

  const onSubmit = async (data: StorageBoxInput) => {
    setIsSubmitting(true);
    try {
      await createStorageBox(data);
      toast.success("Storage box created successfully!");
      router.push("/dashboard/storage");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create storage box");
    } finally {
      setIsSubmitting(false);
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
          <CardTitle className="text-2xl uppercase tracking-wide text-primary gold-glow">
            Add Storage Box
          </CardTitle>
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
                {isSubmitting ? "Creating..." : "Create Storage Box"}
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
