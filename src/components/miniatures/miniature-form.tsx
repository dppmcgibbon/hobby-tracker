"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { miniatureSchema, type MiniatureInput } from "@/lib/validations/miniature";
import { createMiniature, updateMiniature } from "@/app/actions/miniatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import type { Faction, Miniature } from "@/types";

interface MiniatureFormProps {
  factions: Faction[];
  miniature?: Miniature;
  onSuccess?: () => void;
}

export function MiniatureForm({ factions, miniature, onSuccess }: MiniatureFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MiniatureInput>({
    resolver: zodResolver(miniatureSchema),
    defaultValues: miniature
      ? {
          name: miniature.name,
          faction_id: miniature.faction_id || undefined,
          unit_type: miniature.unit_type || undefined,
          quantity: miniature.quantity,
          material: miniature.material || undefined,
          base_size: miniature.base_size || undefined,
          sculptor: miniature.sculptor || undefined,
          year: miniature.year || undefined,
          notes: miniature.notes || undefined,
        }
      : {
          quantity: 1,
        },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const factionId = watch("faction_id");

  const onSubmit = async (data: MiniatureInput) => {
    setIsLoading(true);
    setError(null);

    try {
      if (miniature) {
        await updateMiniature(miniature.id, data);
      } else {
        await createMiniature(data);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/collection");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Primaris Intercessor Squad"
          {...register("name")}
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="faction_id">Faction</Label>
          <Select
            value={factionId || ""}
            onValueChange={(value) => setValue("faction_id", value || null)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a faction" />
            </SelectTrigger>
            <SelectContent>
              {factions.map((faction) => (
                <SelectItem key={faction.id} value={faction.id}>
                  {faction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.faction_id && (
            <p className="text-sm text-destructive">{errors.faction_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit_type">Unit Type</Label>
          <Input
            id="unit_type"
            placeholder="e.g., Troops, HQ, Elites"
            {...register("unit_type")}
            disabled={isLoading}
          />
          {errors.unit_type && (
            <p className="text-sm text-destructive">{errors.unit_type.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            {...register("quantity")}
            disabled={isLoading}
          />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_size">Base Size</Label>
          <Input
            id="base_size"
            placeholder="e.g., 32mm"
            {...register("base_size")}
            disabled={isLoading}
          />
          {errors.base_size && (
            <p className="text-sm text-destructive">{errors.base_size.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            placeholder="e.g., Plastic, Resin"
            {...register("material")}
            disabled={isLoading}
          />
          {errors.material && <p className="text-sm text-destructive">{errors.material.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sculptor">Sculptor</Label>
          <Input
            id="sculptor"
            placeholder="Sculptor name"
            {...register("sculptor")}
            disabled={isLoading}
          />
          {errors.sculptor && <p className="text-sm text-destructive">{errors.sculptor.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min="1987"
            max={new Date().getFullYear()}
            placeholder={new Date().getFullYear().toString()}
            {...register("year")}
            disabled={isLoading}
          />
          {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this miniature..."
          rows={4}
          {...register("notes")}
          disabled={isLoading}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {miniature ? "Update" : "Create"} Miniature
        </Button>
      </div>
    </form>
  );
}
