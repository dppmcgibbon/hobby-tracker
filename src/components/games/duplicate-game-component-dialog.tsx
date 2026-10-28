"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, Camera, Box } from "lucide-react";
import { duplicateGameComponent } from "@/app/actions/game-components";
import { COMPONENT_TYPES, COMPONENT_STATUSES } from "@/components/games/game-component-form-dialog";
import { getR2PublicUrl } from "@/lib/r2";
import { getPhotoImageUrl } from "@/lib/photos";
import type { GameComponent, GameComponentWithPhotos } from "@/types";
import { toast } from "sonner";

export interface DuplicateGameComponentDialogProps {
  component: GameComponent | GameComponentWithPhotos | null;
  boxes?: Array<{ id: string; name: string }>;
  currentBoxId?: string;
  currentBoxName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (duplicatedComponent: GameComponentWithPhotos) => void;
}

export function DuplicateGameComponentDialog({
  component,
  boxes,
  currentBoxId,
  currentBoxName,
  open,
  onOpenChange,
  onSuccess,
}: DuplicateGameComponentDialogProps) {
  const router = useRouter();
  const [duplicateName, setDuplicateName] = useState("");
  const [targetBoxId, setTargetBoxId] = useState("");
  const [copyPhotos, setCopyPhotos] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Photos on source component
  const compWithPhotos = component as GameComponentWithPhotos | null;
  const photos = compWithPhotos?.photos || compWithPhotos?.game_component_photos || [];
  const primaryStoragePath =
    photos.length > 0 ? photos[0].storage_path : component?.image_storage_path;
  const hasPhotos = Boolean(photos.length > 0 || component?.image_storage_path);
  const photoCount = photos.length > 0 ? photos.length : component?.image_storage_path ? 1 : 0;

  const photoUrl = primaryStoragePath ? getR2PublicUrl(primaryStoragePath) : null;
  const displayImageUrl = photoUrl ? getPhotoImageUrl(photoUrl, component?.image_updated_at) : null;

  useEffect(() => {
    if (component && open) {
      setDuplicateName(component.name);
      const defaultBoxId = currentBoxId || component.game_box_id || (boxes && boxes[0]?.id) || "";
      setTargetBoxId(defaultBoxId);
      setCopyPhotos(hasPhotos);
    }
  }, [component, open, currentBoxId, boxes, hasPhotos]);

  if (!component) return null;

  const typeConfig = COMPONENT_TYPES.find((t) => t.value === component.component_type);
  const statusConfig = COMPONENT_STATUSES.find((s) => s.value === component.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateName.trim()) {
      toast.error("Component name is required");
      return;
    }

    setIsDuplicating(true);
    try {
      const res = await duplicateGameComponent(component.id, {
        name: duplicateName.trim(),
        game_box_id: targetBoxId || undefined,
        copyPhotos: hasPhotos ? copyPhotos : false,
      });

      toast.success(`Component "${duplicateName.trim()}" duplicated successfully!`);
      onOpenChange(false);
      if (res.component) {
        onSuccess?.(res.component as GameComponentWithPhotos);
      }
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate component");
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDuplicating && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Copy className="h-5 w-5 text-primary" />
              Duplicate Component
            </DialogTitle>
            <DialogDescription>
              Create a duplicate of this component and choose target settings.
            </DialogDescription>
          </DialogHeader>

          {/* Original Component Summary Preview */}
          <div className="rounded-lg border border-primary/20 bg-muted/40 p-3 flex items-start gap-3">
            {displayImageUrl ? (
              <div className="relative h-14 w-14 rounded overflow-hidden border border-primary/30 shrink-0 bg-background/80">
                <Image
                  src={displayImageUrl}
                  alt={component.name}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-14 w-14 rounded border border-dashed border-primary/30 shrink-0 flex items-center justify-center bg-background/40 text-muted-foreground">
                <Box className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wider border-primary/30 text-primary py-0"
                >
                  {typeConfig?.label || component.component_type || "Component"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono py-0 font-bold">
                  Qty: {component.quantity_actual ?? 0}/{component.quantity_expected ?? 0}
                </Badge>
                {statusConfig && (
                  <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-foreground truncate">{component.name}</h4>
              {currentBoxName && (
                <p className="text-xs text-muted-foreground truncate">
                  Box: <span className="font-medium text-foreground">{currentBoxName}</span>
                </p>
              )}
            </div>
          </div>

          {/* New Component Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="duplicate-component-name"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              New Component Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="duplicate-component-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="e.g. Rulebook"
              required
              disabled={isDuplicating}
              autoFocus
            />
          </div>

          {/* Target Game Box Selection (if multiple boxes available) */}
          {boxes && boxes.length > 1 && (
            <div className="space-y-1.5">
              <Label
                htmlFor="duplicate-component-target-box"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Target Game Box
              </Label>
              <Select value={targetBoxId} onValueChange={setTargetBoxId} disabled={isDuplicating}>
                <SelectTrigger id="duplicate-component-target-box" className="w-full">
                  <SelectValue placeholder="Select target box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                You can duplicate this component into the same box or another box.
              </p>
            </div>
          )}

          {/* Copy Photos Option */}
          {hasPhotos && (
            <div className="flex items-start space-x-3 rounded-lg border border-primary/20 bg-muted/20 p-3">
              <Checkbox
                id="duplicate-copy-photos"
                checked={copyPhotos}
                onCheckedChange={(checked) => setCopyPhotos(Boolean(checked))}
                disabled={isDuplicating}
                className="mt-0.5"
              />
              <div
                className="grid gap-1 leading-none cursor-pointer select-none"
                onClick={() => !isDuplicating && setCopyPhotos(!copyPhotos)}
              >
                <Label
                  htmlFor="duplicate-copy-photos"
                  className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  Copy photos ({photoCount})
                </Label>
                <p className="text-xs text-muted-foreground">
                  Duplicate associated photos in storage so the new component has its own images.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDuplicating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDuplicating || !duplicateName.trim()}
              className="gap-2"
            >
              {isDuplicating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Duplicate Component
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
