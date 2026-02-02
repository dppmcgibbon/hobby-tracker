"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit, Trash2, Plus, Minus } from "lucide-react";
import { MaterialFormDialog } from "./material-form-dialog";
import { updateMaterialQuantity, deleteMaterial } from "@/app/actions/materials";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
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

interface MaterialCardProps {
  material: {
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
}

export function MaterialCard({ material }: MaterialCardProps) {
  const router = useRouter();
  const [adjustAmount, setAdjustAmount] = useState<number>(100);

  const quantity = material.type === "resin" ? material.quantity_ml : material.quantity_grams;
  const unit = material.type === "resin" ? "ml" : "g";
  const quantityType = material.type === "resin" ? "ml" : "grams";

  const handleAdjustQuantity = async (change: number) => {
    try {
      await updateMaterialQuantity(material.id, change, quantityType as "ml" | "grams");
      toast.success(`${change > 0 ? "Added" : "Removed"} ${Math.abs(change)}${unit}`);
      router.refresh();
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMaterial(material.id);
      toast.success("Material deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete material");
    }
  };

  // Calculate percentage for visual indicator (assuming 1000 is full)
  const maxQuantity = material.type === "resin" ? 1000 : 1000;
  const percentage = quantity ? Math.min((quantity / maxQuantity) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{material.name}</CardTitle>
            {material.brand && <p className="text-sm text-muted-foreground">{material.brand}</p>}
          </div>
          <Badge variant="outline" className="capitalize">
            {material.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {material.color && (
          <div className="flex items-center gap-2">
            {material.color_hex && (
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: material.color_hex }}
              />
            )}
            <span className="text-sm">{material.color}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Quantity</span>
            <span className="text-muted-foreground">
              {quantity || 0} {unit}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {material.cost_per_unit && (
          <div className="text-sm text-muted-foreground">
            ${material.cost_per_unit} per {unit}
          </div>
        )}

        {material.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{material.notes}</p>
        )}

        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
            className="w-24 h-8 text-sm"
            min="1"
          />
          <Button size="sm" variant="outline" onClick={() => handleAdjustQuantity(adjustAmount)}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAdjustQuantity(-adjustAmount)}>
            <Minus className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <MaterialFormDialog
          material={material}
          trigger={
            <Button variant="outline" size="sm" className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          }
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Material?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {material.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
