"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X, Loader2, Ratio, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { fetchPhotoBlob } from "@/lib/photos";
import { cropImageBlob, type CropRect } from "@/lib/image-crop";

export type AspectRatioOption = "free" | "1:1" | "4:3" | "3:4" | "16:9";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  sourceBlob?: Blob | null;
  title?: string;
  defaultAspect?: AspectRatioOption;
  onApplyCrop: (croppedBlob: Blob) => Promise<void>;
}

type DragHandle = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

function getRatioNumber(aspect: AspectRatioOption): number | null {
  switch (aspect) {
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    case "16:9":
      return 16 / 9;
    default:
      return null;
  }
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  sourceBlob,
  title = "Crop Image",
  defaultAspect = "free",
  onApplyCrop,
}: ImageCropDialogProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>(defaultAspect);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, width: 80, height: 80 });
  const [isApplying, setIsApplying] = useState(false);
  const [loadedBlob, setLoadedBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>("");

  const [draggingHandle, setDraggingHandle] = useState<DragHandle | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ clientX: number; clientY: number } | null>(null);
  const [initialCropRect, setInitialCropRect] = useState<CropRect | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Load clean Blob to prevent tainted canvas SecurityError
  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    async function loadCleanImage() {
      if (!open || !imageUrl) return;

      try {
        let b: Blob;
        if (sourceBlob) {
          b = sourceBlob;
        } else {
          b = await fetchPhotoBlob(imageUrl);
        }

        if (!active) return;
        setLoadedBlob(b);
        const objectUrl = URL.createObjectURL(b);
        urlToRevoke = objectUrl;
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load clean image for crop:", err);
        // Fallback directly to imageUrl
        if (active) {
          setBlobUrl(imageUrl);
        }
      }
    }

    if (open) {
      loadCleanImage();
      setAspectRatio(defaultAspect);
      setCropRect({ x: 10, y: 10, width: 80, height: 80 });
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [open, imageUrl, sourceBlob, defaultAspect]);

  const resetCrop = useCallback(
    (aspect: AspectRatioOption = aspectRatio) => {
      const ratio = getRatioNumber(aspect);
      if (!ratio || !imageContainerRef.current) {
        setCropRect({ x: 10, y: 10, width: 80, height: 80 });
        return;
      }

      const { width: cW, height: cH } = imageContainerRef.current.getBoundingClientRect();
      if (cW === 0 || cH === 0) {
        setCropRect({ x: 10, y: 10, width: 80, height: 80 });
        return;
      }

      let targetW = cW * 0.85;
      let targetH = targetW / ratio;
      if (targetH > cH * 0.85) {
        targetH = cH * 0.85;
        targetW = targetH * ratio;
      }

      const wPercent = (targetW / cW) * 100;
      const hPercent = (targetH / cH) * 100;

      setCropRect({
        x: Math.max(0, (100 - wPercent) / 2),
        y: Math.max(0, (100 - hPercent) / 2),
        width: Math.min(100, wPercent),
        height: Math.min(100, hPercent),
      });
    },
    [aspectRatio]
  );

  const handleAspectChange = (aspect: AspectRatioOption) => {
    setAspectRatio(aspect);
    resetCrop(aspect);
  };

  const handlePointerDown = (e: React.PointerEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDraggingHandle(handle);
    setDragStartPos({ clientX: e.clientX, clientY: e.clientY });
    setInitialCropRect({ ...cropRect });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingHandle || !dragStartPos || !initialCropRect || !imageContainerRef.current) return;

    const containerRect = imageContainerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragStartPos.clientX) / containerRect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.clientY) / containerRect.height) * 100;

    let { x, y, width, height } = initialCropRect;

    if (draggingHandle === "move") {
      x = Math.max(0, Math.min(100 - width, initialCropRect.x + deltaXPercent));
      y = Math.max(0, Math.min(100 - height, initialCropRect.y + deltaYPercent));
    } else {
      if (draggingHandle.includes("w")) {
        const newX = Math.max(
          0,
          Math.min(initialCropRect.x + initialCropRect.width - 5, initialCropRect.x + deltaXPercent)
        );
        width = initialCropRect.width + (initialCropRect.x - newX);
        x = newX;
      }
      if (draggingHandle.includes("e")) {
        width = Math.max(5, Math.min(100 - x, initialCropRect.width + deltaXPercent));
      }
      if (draggingHandle.includes("n")) {
        const newY = Math.max(
          0,
          Math.min(initialCropRect.y + initialCropRect.height - 5, initialCropRect.y + deltaYPercent)
        );
        height = initialCropRect.height + (initialCropRect.y - newY);
        y = newY;
      }
      if (draggingHandle.includes("s")) {
        height = Math.max(5, Math.min(100 - y, initialCropRect.height + deltaYPercent));
      }

      const ratio = getRatioNumber(aspectRatio);
      if (ratio) {
        const pixelWidth = (width / 100) * containerRect.width;
        const desiredPixelHeight = pixelWidth / ratio;
        const desiredHeightPercent = (desiredPixelHeight / containerRect.height) * 100;
        if (y + desiredHeightPercent <= 100) {
          height = desiredHeightPercent;
        } else {
          // If height overflows, clamp width to fit available height
          const maxAvailHeight = 100 - y;
          const maxPixelHeight = (maxAvailHeight / 100) * containerRect.height;
          const clampedPixelWidth = maxPixelHeight * ratio;
          width = (clampedPixelWidth / containerRect.width) * 100;
          height = maxAvailHeight;
        }
      }
    }

    setCropRect({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingHandle(null);
      setDragStartPos(null);
      setInitialCropRect(null);
    }
  };

  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      let source: Blob = loadedBlob!;
      if (!source) {
        source = await fetchPhotoBlob(imageUrl);
      }

      const croppedBlob = await cropImageBlob(source, cropRect);
      await onApplyCrop(croppedBlob);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply crop";
      console.error("Crop error:", err);
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isApplying ? undefined : onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-neutral-950 border border-primary/30 text-white shadow-2xl flex flex-col max-h-[90vh]"
        showCloseButton={!isApplying}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Drag handles to adjust the crop area, choose an aspect ratio, and click save.
        </DialogDescription>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary/20 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <Ratio className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1 bg-black/50 border border-primary/20 rounded p-0.5 mr-6 sm:mr-8">
            {(["free", "1:1", "4:3", "3:4", "16:9"] as AspectRatioOption[]).map((aspect) => (
              <button
                key={aspect}
                type="button"
                onClick={() => handleAspectChange(aspect)}
                className={`px-2 py-1 text-xs rounded transition-colors font-mono ${
                  aspectRatio === aspect
                    ? "bg-primary text-black font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {aspect === "free" ? "Free" : aspect}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div className="relative flex-1 min-h-[350px] max-h-[65vh] flex items-center justify-center p-4 bg-neutral-950/90 overflow-hidden select-none">
          {blobUrl ? (
            <div
              ref={imageContainerRef}
              className="relative inline-block max-w-full max-h-[58vh] overflow-hidden rounded border border-neutral-800"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Image Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageElementRef}
                src={blobUrl}
                alt="Crop preview"
                className="max-h-[58vh] w-auto object-contain block pointer-events-none"
                draggable={false}
              />

              {/* Dark Cutout Mask */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <mask id="reusable-crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={`${cropRect.x}%`}
                      y={`${cropRect.y}%`}
                      width={`${cropRect.width}%`}
                      height={`${cropRect.height}%`}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.65)"
                  mask="url(#reusable-crop-mask)"
                />
              </svg>

              {/* Active Crop Box */}
              <div
                style={{
                  left: `${cropRect.x}%`,
                  top: `${cropRect.y}%`,
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "move")}
                className="absolute z-20 cursor-move border-2 border-primary shadow-gold select-none"
              >
                {/* Rule-of-thirds Grid Lines */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-primary/25" />
                  <div className="border-r border-b border-primary/25" />
                  <div className="border-b border-primary/25" />
                  <div className="border-r border-b border-primary/25" />
                  <div className="border-r border-b border-primary/25" />
                  <div className="border-b border-primary/25" />
                  <div className="border-r border-b border-primary/25" />
                  <div className="border-r border-b border-primary/25" />
                  <div />
                </div>

                {/* Corner Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, "nw")}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-primary border border-black cursor-nwse-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "ne")}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary border border-black cursor-nesw-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "sw")}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-primary border border-black cursor-nesw-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "se")}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary border border-black cursor-nwse-resize"
                />

                {/* Edge Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, "n")}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-primary border border-black cursor-ns-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "s")}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-primary border border-black cursor-ns-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "w")}
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 bg-primary border border-black cursor-ew-resize"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "e")}
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 bg-primary border border-black cursor-ew-resize"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-neutral-400">Loading image...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-primary/20 bg-neutral-900/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetCrop(aspectRatio)}
            disabled={isApplying}
            className="text-xs text-neutral-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Box
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="text-xs text-neutral-300 hover:text-white"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={isApplying || !blobUrl}
              className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Apply & Save Crop
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
