"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eraser, Crop, Check, X, RotateCcw, Save, Loader2, Ratio } from "lucide-react";
import { toast } from "sonner";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { fetchPhotoBlob } from "@/lib/photos";
import {
  getGamePdfCoverUploadUrl,
  savePdfCoverImage,
  saveGameCover,
  type GameEntityType,
} from "@/app/actions/games";

interface GameCoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  entityType?: GameEntityType;
  entityId?: string;
  firstPdfId?: string | null;
}

interface CropRect {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

type DragHandle = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export function GameCoverModal({
  open,
  onOpenChange,
  imageUrl,
  title,
  entityType,
  entityId,
  firstPdfId,
}: GameCoverModalProps) {
  const router = useRouter();

  // Working image states
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState<string>(imageUrl);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [editedBlob, setEditedBlob] = useState<Blob | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Processing states
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [lockAspect, setLockAspect] = useState<"free" | "3:4">("3:4");

  // Crop box state (percentages of container image)
  const [cropRect, setCropRect] = useState<CropRect>({ x: 5, y: 5, width: 90, height: 90 });
  const [draggingHandle, setDraggingHandle] = useState<DragHandle | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ clientX: number; clientY: number } | null>(
    null
  );
  const [initialCropRect, setInitialCropRect] = useState<CropRect | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Reset when opened with new image
  useEffect(() => {
    if (open) {
      setCurrentDisplayUrl(imageUrl);
      setOriginalBlob(null);
      setEditedBlob(null);
      setHasUnsavedChanges(false);
      setIsCropping(false);
      setCropRect({ x: 5, y: 5, width: 90, height: 90 });
    }
  }, [open, imageUrl]);

  // Clean up any blob URLs created
  useEffect(() => {
    return () => {
      if (currentDisplayUrl && currentDisplayUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentDisplayUrl);
      }
    };
  }, [currentDisplayUrl]);

  // Load image as blob if needed
  const ensureBlob = useCallback(async (): Promise<Blob> => {
    if (editedBlob) return editedBlob;
    if (originalBlob) return originalBlob;
    const blob = await fetchPhotoBlob(currentDisplayUrl);
    setOriginalBlob(blob);
    return blob;
  }, [currentDisplayUrl, editedBlob, originalBlob]);

  // Handle Background Removal
  const handleRemoveBackground = async () => {
    if (isRemovingBg || isCropping) return;
    setIsRemovingBg(true);

    try {
      toast.info("Removing background...", { duration: 3000 });
      const sourceBlob = await ensureBlob();
      const resultBlob = await removeBackgroundInBrowser(sourceBlob);

      const newUrl = URL.createObjectURL(resultBlob);
      setCurrentDisplayUrl(newUrl);
      setEditedBlob(resultBlob);
      setHasUnsavedChanges(true);
      toast.success("Background removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove background";
      console.error("Background removal error:", err);
      toast.error(msg);
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Start Crop Mode
  const handleStartCrop = () => {
    if (isRemovingBg) return;
    setCropRect({ x: 10, y: 10, width: 80, height: 80 });
    setIsCropping(true);
  };

  // Apply Crop via Canvas (loads clean same-origin blob to avoid "The operation is insecure")
  const handleApplyCrop = async () => {
    if (isApplyingCrop) return;
    setIsApplyingCrop(true);

    try {
      // Ensure we have a same-origin Blob to prevent tainted canvas SecurityError
      const sourceBlob = await ensureBlob();
      const blobUrl = URL.createObjectURL(sourceBlob);

      const cleanImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image for cropping"));
        img.src = blobUrl;
      });

      const naturalWidth = cleanImg.naturalWidth;
      const naturalHeight = cleanImg.naturalHeight;

      const sx = Math.max(0, Math.floor((cropRect.x / 100) * naturalWidth));
      const sy = Math.max(0, Math.floor((cropRect.y / 100) * naturalHeight));
      const sWidth = Math.min(naturalWidth - sx, Math.floor((cropRect.width / 100) * naturalWidth));
      const sHeight = Math.min(
        naturalHeight - sy,
        Math.floor((cropRect.height / 100) * naturalHeight)
      );

      if (sWidth <= 0 || sHeight <= 0) {
        URL.revokeObjectURL(blobUrl);
        toast.error("Invalid crop area selected.");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sWidth;
      canvas.height = sHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        throw new Error("Unable to create canvas context");
      }

      ctx.drawImage(cleanImg, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      URL.revokeObjectURL(blobUrl);

      const mimeType = sourceBlob.type === "image/png" ? "image/png" : "image/webp";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to export cropped image"))),
          mimeType,
          0.92
        );
      });

      const newUrl = URL.createObjectURL(blob);
      setCurrentDisplayUrl(newUrl);
      setEditedBlob(blob);
      setHasUnsavedChanges(true);
      setIsCropping(false);
      toast.success("Image cropped");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply crop";
      console.error("Crop error:", err);
      toast.error(msg);
    } finally {
      setIsApplyingCrop(false);
    }
  };

  // Cancel Crop Mode
  const handleCancelCrop = () => {
    setIsCropping(false);
  };

  // Revert all edits back to original
  const handleRevert = () => {
    setCurrentDisplayUrl(imageUrl);
    setEditedBlob(null);
    setHasUnsavedChanges(false);
    setIsCropping(false);
    toast.info("Reverted edits");
  };

  // Save changes to Cloudflare R2 and DB
  const handleSave = async () => {
    if (!editedBlob || !entityType || !entityId) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      toast.info("Saving cover image...");
      const contentType = editedBlob.type || "image/png";
      const cleanTitle = title.replace(/[^a-zA-Z0-9._-]/g, "_");

      const presigned = await getGamePdfCoverUploadUrl(
        entityType,
        entityId,
        cleanTitle,
        contentType
      );

      const uploadRes = await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: editedBlob,
        headers: {
          "Content-Type": contentType,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload to storage (HTTP ${uploadRes.status})`);
      }

      // If this cover is from the first PDF, update the PDF record's cover_image
      if (firstPdfId) {
        await savePdfCoverImage(entityType, entityId, firstPdfId, presigned.key);
      }

      // Also persist to the entity's cover_image
      await saveGameCover(entityType, entityId, presigned.key);

      toast.success("Cover image saved!");
      setHasUnsavedChanges(false);
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save cover image";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Pointer event handlers for interactive cropping
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
          Math.min(
            initialCropRect.y + initialCropRect.height - 5,
            initialCropRect.y + deltaYPercent
          )
        );
        height = initialCropRect.height + (initialCropRect.y - newY);
        y = newY;
      }
      if (draggingHandle.includes("s")) {
        height = Math.max(5, Math.min(100 - y, initialCropRect.height + deltaYPercent));
      }

      if (lockAspect === "3:4" && imageElementRef.current) {
        const targetAspect = 3 / 4;
        const pixelWidth = (width / 100) * containerRect.width;
        const desiredPixelHeight = pixelWidth / targetAspect;
        const desiredHeightPercent = (desiredPixelHeight / containerRect.height) * 100;
        if (y + desiredHeightPercent <= 100) {
          height = desiredHeightPercent;
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
        // ignore pointer release errors
      }
      setDraggingHandle(null);
      setDragStartPos(null);
      setInitialCropRect(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 border-2 border-primary/40 bg-neutral-950 overflow-hidden shadow-2xl rounded-sm"
        style={{
          width: "min(860px, calc(100vw - 2rem))",
          maxWidth: "860px",
        }}
      >
        <DialogTitle className="sr-only">{title} Cover</DialogTitle>
        <DialogDescription className="sr-only">Cover image viewer and editor</DialogDescription>

        {/* Main Solid Opaque Workspace Area */}
        <div className="relative w-full h-[75vh] max-h-[750px] min-h-[450px] bg-neutral-950 flex items-center justify-center select-none overflow-hidden">
          {/* Overlaid Floating Action Icons - Top Right */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-neutral-900/90 border border-primary/40 rounded-md p-1 shadow-2xl backdrop-blur-sm">
            <TooltipProvider delayDuration={150}>
              {/* Remove Background Action */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isRemovingBg || isCropping}
                    onClick={handleRemoveBackground}
                    className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary rounded-sm"
                    aria-label="Remove background"
                  >
                    {isRemovingBg ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Eraser className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-semibold">
                  Remove background
                </TooltipContent>
              </Tooltip>

              {/* Crop Image Action */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isRemovingBg}
                    onClick={handleStartCrop}
                    className={`h-8 w-8 rounded-sm ${
                      isCropping
                        ? "bg-primary text-black hover:bg-primary/90"
                        : "text-primary hover:bg-primary/20 hover:text-primary"
                    }`}
                    aria-label="Crop image"
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-semibold">
                  Crop image
                </TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-primary/30 mx-0.5" />

              {/* Close Dialog Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipProvider>
          </div>

          {/* Title Badge - Top Left */}
          <div className="absolute top-3 left-3 z-30 bg-neutral-900/90 border border-primary/30 px-3 py-1 rounded-sm shadow-lg pointer-events-none">
            <p className="text-xs font-bold uppercase tracking-wider text-primary truncate max-w-[280px]">
              {title}
            </p>
          </div>

          {/* Cropping Mode Overlaid Controls */}
          {isCropping && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-neutral-900/95 border-2 border-primary/60 rounded-full px-3 py-1 shadow-2xl">
              {/* Aspect Ratio Preset Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLockAspect(lockAspect === "3:4" ? "free" : "3:4")}
                className={`h-7 text-[11px] px-2 rounded-full font-bold uppercase tracking-wider ${
                  lockAspect === "3:4"
                    ? "bg-primary text-black font-black"
                    : "border border-primary/40 text-muted-foreground hover:text-primary"
                }`}
              >
                <Ratio className="h-3 w-3 mr-1" />
                {lockAspect === "3:4" ? "3:4" : "Free"}
              </Button>

              <div className="h-3.5 w-px bg-primary/30 mx-1" />

              <Button
                type="button"
                size="sm"
                disabled={isApplyingCrop}
                onClick={handleApplyCrop}
                className="h-7 px-2.5 rounded-full bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {isApplyingCrop ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Apply
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isApplyingCrop}
                onClick={handleCancelCrop}
                className="h-7 px-2 rounded-full text-muted-foreground hover:text-foreground text-xs uppercase font-bold tracking-wider"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          )}

          {/* Image and Active Cropping Surface */}
          <div
            ref={imageContainerRef}
            className="relative max-h-[70vh] max-w-[90%] flex items-center justify-center select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageElementRef}
              src={currentDisplayUrl}
              alt={title}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-sm shadow-2xl pointer-events-none block"
            />

            {/* Background Removal Spinner */}
            {isRemovingBg && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center z-40">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Removing Background...
                </p>
              </div>
            )}

            {/* Interactive Crop Box Overlay */}
            {isCropping && (
              <div
                className="absolute inset-0 pointer-events-auto"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Semi-transparent Dark Mask Outside the Crop Rectangle */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <defs>
                    <mask id="crop-mask">
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
                    mask="url(#crop-mask)"
                  />
                </svg>

                {/* The Active Crop Box */}
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
                  {/* Grid Lines */}
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
            )}
          </div>

          {/* Bottom Floating Save / Revert Bar (Only when there are edits to save) */}
          {hasUnsavedChanges && !isCropping && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-neutral-900/95 border-2 border-primary/60 rounded-full px-4 py-2 shadow-2xl">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRevert}
                disabled={isSaving || isRemovingBg}
                className="h-7 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Revert
              </Button>

              <div className="h-4 w-px bg-primary/30 mx-1" />

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isRemovingBg}
                className="h-7 px-3.5 rounded-full bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider shadow-gold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
