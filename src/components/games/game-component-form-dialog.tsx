"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Layers, Copy } from "lucide-react";
import { createGameComponent, updateGameComponent } from "@/app/actions/game-components";
import { DuplicateGameComponentDialog } from "@/components/games/duplicate-game-component-dialog";
import type { GameComponent } from "@/types";
import { toast } from "sonner";

interface GameComponentFormDialogProps {
  component?: GameComponent | null;
  gameBoxId: string;
  gameBoxName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (component?: GameComponent) => void;
}

export const COMPONENT_TYPES = [
  { value: "rulebook", label: "Rulebook / Quest Book" },
  { value: "cards", label: "Cards / Decks" },
  { value: "dice", label: "Dice" },
  { value: "tokens", label: "Tokens / Counters" },
  { value: "tiles", label: "Tiles / Floor Plans" },
  { value: "boards", label: "Game Board / Player Boards" },
  { value: "miniatures", label: "Miniatures / Figures" },
  { value: "markers", label: "Markers / Pins" },
  { value: "scenery", label: "Scenery / Furniture / Doors" },
  { value: "other", label: "Other Component" },
];

export const COMPONENT_STATUSES = [
  { value: "complete", label: "Complete / In Box" },
  { value: "missing_parts", label: "Missing Parts / Quantities" },
  { value: "damaged", label: "Damaged / Needs Repair" },
  { value: "sleeved", label: "Sleeved / Protected" },
  { value: "painted", label: "Painted / Customized" },
  { value: "upgraded", label: "Upgraded / Third-Party" },
];

export function GameComponentFormDialog({
  component,
  gameBoxId,
  gameBoxName,
  open,
  onOpenChange,
  onSuccess,
}: GameComponentFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const [name, setName] = useState("");
  const [componentType, setComponentType] = useState("other");
  const [quantityExpected, setQuantityExpected] = useState<number | string>(1);
  const [quantityActual, setQuantityActual] = useState<number | string>(1);
  const [status, setStatus] = useState("complete");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (component) {
      setName(component.name);
      setComponentType(component.component_type || "other");
      setQuantityExpected(component.quantity_expected ?? 1);
      setQuantityActual(component.quantity_actual ?? 1);
      setStatus(component.status || "complete");
      setDescription(component.description || "");
      setNotes(component.notes || "");
    } else {
      setName("");
      setComponentType("tokens");
      setQuantityExpected(1);
      setQuantityActual(1);
      setStatus("complete");
      setDescription("");
      setNotes("");
    }
  }, [component, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Component name is required");
      return;
    }

    const numExpected =
      typeof quantityExpected === "number"
        ? Math.max(0, quantityExpected)
        : Math.max(0, parseInt(String(quantityExpected), 10) || 0);

    const numActual =
      typeof quantityActual === "number"
        ? Math.max(0, quantityActual)
        : Math.max(0, parseInt(String(quantityActual), 10) || 0);

    setIsSubmitting(true);
    try {
      if (component) {
        const res = await updateGameComponent(component.id, {
          name: name.trim(),
          component_type: componentType,
          quantity_expected: numExpected,
          quantity_actual: numActual,
          status,
          description: description.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success("Component updated successfully!");
        onSuccess?.(res.component as GameComponent);
      } else {
        const res = await createGameComponent({
          game_box_id: gameBoxId,
          name: name.trim(),
          component_type: componentType,
          quantity_expected: numExpected,
          quantity_actual: numActual,
          status,
          description: description.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success("Component added to box!");
        onSuccess?.(res.component as GameComponent);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save game component");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Layers className="h-5 w-5 text-primary" />
              {component ? "Edit Component" : "Add Component"}
            </DialogTitle>
            <DialogDescription>
              {gameBoxName ? `In box: ${gameBoxName}` : "Component inventory entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comp-name">Component Name *</Label>
              <Input
                id="comp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Combat Dice, Character Cards, Rulebook"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comp-type">Type</Label>
                <Select value={componentType} onValueChange={setComponentType}>
                  <SelectTrigger id="comp-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="comp-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comp-qty-actual">Actual Quantity</Label>
                <Input
                  id="comp-qty-actual"
                  type="number"
                  min="0"
                  value={quantityActual}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantityActual(val === "" ? "" : Math.max(0, parseInt(val, 10) || 0));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-qty-expected">Expected Quantity</Label>
                <Input
                  id="comp-qty-expected"
                  type="number"
                  min="0"
                  value={quantityExpected}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantityExpected(val === "" ? "" : Math.max(0, parseInt(val, 10) || 0));
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-desc">Description</Label>
              <Input
                id="comp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Red attack dice, 14mm with custom skulls"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-notes">Notes</Label>
              <Textarea
                id="comp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details, missing pieces notes, sleeve size..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
            {component && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDuplicateDialog(true)}
                disabled={isSubmitting}
                className="gap-1.5 sm:mr-auto text-muted-foreground hover:text-foreground"
                title="Duplicate this component"
              >
                <Copy className="h-4 w-4 text-primary" />
                Duplicate
              </Button>
            )}
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {component ? "Save Changes" : "Add Component"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {showDuplicateDialog && component && (
        <DuplicateGameComponentDialog
          component={component}
          currentBoxId={gameBoxId}
          currentBoxName={gameBoxName}
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          onSuccess={(duplicated) => {
            setShowDuplicateDialog(false);
            onOpenChange(false);
            onSuccess?.(duplicated);
          }}
        />
      )}
    </Dialog>
  );
}
