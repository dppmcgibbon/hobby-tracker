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
import { Loader2, Box } from "lucide-react";
import { createGameBox, updateGameBox } from "@/app/actions/game-boxes";
import type { GameBox, Edition, Expansion } from "@/types";
import { toast } from "sonner";

interface GameBoxFormDialogProps {
  box?: GameBox | null;
  gameId?: string;
  editionId?: string | null;
  expansionId?: string | null;
  availableEditions?: Edition[];
  availableExpansions?: Expansion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (box?: GameBox) => void;
}

const BOX_TYPES = [
  { value: "core", label: "Core Game Box" },
  { value: "expansion", label: "Expansion Box" },
  { value: "starter", label: "Starter Set / Launch Box" },
  { value: "collector", label: "Collector's / Limited Edition" },
  { value: "accessory", label: "Accessory / Token Box" },
  { value: "custom", label: "Custom Storage Box" },
];

const CONDITIONS = [
  { value: "mint", label: "Mint / Like New" },
  { value: "near_mint", label: "Near Mint" },
  { value: "good", label: "Good / Normal Wear" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Worn / Corner Tears" },
  { value: "damaged", label: "Damaged / Taped" },
];

export function GameBoxFormDialog({
  box,
  gameId,
  editionId,
  expansionId,
  availableEditions = [],
  availableExpansions = [],
  open,
  onOpenChange,
  onSuccess,
}: GameBoxFormDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [boxType, setBoxType] = useState("core");
  const [condition, setCondition] = useState("good");
  const [location, setLocation] = useState("");
  const [barcode, setBarcode] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [selectedExpansionId, setSelectedExpansionId] = useState<string | null>(null);

  useEffect(() => {
    if (box) {
      setName(box.name);
      setBoxType(box.box_type || "core");
      setCondition(box.condition || "good");
      setLocation(box.location || "");
      setBarcode(box.barcode || "");
      setNotes(box.notes || "");
      setSelectedEditionId(box.edition_id || null);
      setSelectedExpansionId(box.expansion_id || null);
    } else {
      setName(expansionId ? "Expansion Box" : editionId ? "Edition Box" : "Core Box");
      setBoxType(expansionId ? "expansion" : "core");
      setCondition("good");
      setLocation("");
      setBarcode("");
      setNotes("");
      setSelectedEditionId(editionId || null);
      setSelectedExpansionId(expansionId || null);
    }
  }, [box, editionId, expansionId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Box name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (box) {
        const res = await updateGameBox(box.id, {
          name: name.trim(),
          game_id: box.game_id || gameId || "",
          edition_id: selectedEditionId,
          expansion_id: selectedExpansionId,
          box_type: boxType,
          condition,
          location: location.trim() || null,
          barcode: barcode.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success("Game box updated successfully!");
        onSuccess?.(res.box as GameBox);
      } else {
        const res = await createGameBox({
          name: name.trim(),
          game_id: gameId || "",
          edition_id: selectedEditionId,
          expansion_id: selectedExpansionId,
          box_type: boxType,
          condition,
          location: location.trim() || null,
          barcode: barcode.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success("Game box created successfully!");
        onSuccess?.(res.box as GameBox);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save game box");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-primary/30">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Box className="h-5 w-5 text-primary" />
              {box ? "Edit Game Box" : "Add Game Box"}
            </DialogTitle>
            <DialogDescription>
              {box
                ? "Update physical box specifications and location."
                : "Register a physical game box for this game to organize its components."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="box-name">Box Name *</Label>
              <Input
                id="box-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Game Box, 2021 Quest Box"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="box-type">Box Type</Label>
                <Select value={boxType} onValueChange={setBoxType}>
                  <SelectTrigger id="box-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="box-condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="box-condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="box-location">Physical Location</Label>
                <Input
                  id="box-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kallax Shelf 2B, Game Closet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="box-barcode">Barcode / SKU</Label>
                <Input
                  id="box-barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 5011921123456"
                />
              </div>
            </div>

            {availableEditions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="box-edition">Linked Edition (Optional)</Label>
                <Select
                  value={selectedEditionId || "none"}
                  onValueChange={(val) => {
                    const nextId = val === "none" ? null : val;
                    setSelectedEditionId(nextId);
                    if (!nextId) setSelectedExpansionId(null);
                  }}
                >
                  <SelectTrigger id="box-edition">
                    <SelectValue placeholder="None (General Game Box)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General Game Box)</SelectItem>
                    {availableEditions.map((ed) => (
                      <SelectItem key={ed.id} value={ed.id}>
                        {ed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedEditionId && availableExpansions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="box-expansion">Linked Expansion (Optional)</Label>
                <Select
                  value={selectedExpansionId || "none"}
                  onValueChange={(val) => setSelectedExpansionId(val === "none" ? null : val)}
                >
                  <SelectTrigger id="box-expansion">
                    <SelectValue placeholder="None (Base Edition Box)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Base Edition Box)</SelectItem>
                    {availableExpansions
                      .filter((exp) => exp.edition_id === selectedEditionId)
                      .map((exp) => (
                        <SelectItem key={exp.id} value={exp.id}>
                          {exp.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="box-notes">Notes</Label>
              <Textarea
                id="box-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details about the box, inserts, storage trays, or missing cover..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
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
              {box ? "Save Changes" : "Create Box"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
