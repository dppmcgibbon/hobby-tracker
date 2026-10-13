"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Sparkles,
  Crop,
  Eraser,
  RotateCw,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { ImageEraserDialog } from "@/components/ui/image-eraser-dialog";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { fetchPhotoBlob, getPhotoImageUrl } from "@/lib/photos";
import { getR2PublicUrl } from "@/lib/r2";
import { rotateImageBlob } from "@/lib/image-transform";
import {
  uploadComponentPhoto,
  replaceComponentPhotoWithBuffer,
  deleteComponentPhoto,
  getComponentPhotos,
} from "@/app/actions/game-components";
import type { GameComponent, GameComponentPhoto } from "@/types";
import { toast } from "sonner";

interface ComponentWithPhotos extends GameComponent {
  photos?: GameComponentPhoto[];
  game_component_photos?: GameComponentPhoto[];
}

export interface GameComponentPhotoDialogProps {
  component: ComponentWithPhotos | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhotoIndex?: number;
  onSuccess?: () => void;
}

export function GameComponentPhotoDialog({
  component,
  open,
  onOpenChange,
  initialPhotoIndex = 0,
  onSuccess,
}: GameComponentPhotoDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GameComponentPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(initialPhotoIndex);
  const [galleryZoomed, setGalleryZoomed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showEraserDialog, setShowEraserDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<GameComponentPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize and synchronize photos from component prop and server
  useEffect(() => {
    if (!component || !open) {
      setPhotos([]);
      setSelectedPhotoIndex(0);
      return;
    }

    // Initial seed from component prop
    const seedPhotos = component.photos || component.game_component_photos || [];
    if (seedPhotos.length > 0) {
      setPhotos(seedPhotos);
      setSelectedPhotoIndex((prev) => Math.min(prev, seedPhotos.length - 1));
    } else if (component.image_storage_path) {
      const fallbackList: GameComponentPhoto[] = [
        {
          id: component.id,
          component_id: component.id,
          storage_path: component.image_storage_path,
          image_updated_at: component.image_updated_at,
          display_order: 0,
          uploaded_at: component.created_at,
          caption: null,
        },
      ];
      setPhotos(fallbackList);
      setSelectedPhotoIndex(0);
    } else {
      setPhotos([]);
      setSelectedPhotoIndex(0);
    }

    // Refresh freshest photo records from server action
    let isCancelled = false;
    getComponentPhotos(component.id)
      .then((serverPhotos) => {
        if (!isCancelled && serverPhotos) {
          setPhotos(serverPhotos as GameComponentPhoto[]);
          setSelectedPhotoIndex((prev) =>
            Math.min(prev, Math.max(0, serverPhotos.length - 1))
          );
        }
      })
      .catch((err) => {
        console.warn("Could not fetch server component photos:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [component, open]);

  // Set initial photo index when opening
  useEffect(() => {
    if (open) {
      setSelectedPhotoIndex(initialPhotoIndex);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [open, initialPhotoIndex]);

  const resetZoom = useCallback(() => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const handleClose = () => {
    setGalleryZoomed(false);
    resetZoom();
    onOpenChange(false);
  };

  const currentPhoto = photos[selectedPhotoIndex] || null;
  const rawUrl = currentPhoto ? getR2PublicUrl(currentPhoto.storage_path) : null;
  const currentImageUrl = rawUrl
    ? getPhotoImageUrl(rawUrl, currentPhoto?.image_updated_at)
    : null;

  const goToPrevious = useCallback(() => {
    if (selectedPhotoIndex > 0) {
      setSelectedPhotoIndex((prev) => prev - 1);
      resetZoom();
    }
  }, [selectedPhotoIndex, resetZoom]);

  const goToNext = useCallback(() => {
    if (selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex((prev) => prev + 1);
      resetZoom();
    }
  }, [selectedPhotoIndex, photos.length, resetZoom]);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    if (!open || showCropDialog || showEraserDialog || !!photoToDelete) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, showCropDialog, showEraserDialog, photoToDelete, goToPrevious, goToNext]);

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setImagePosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!component) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus("Uploading component photo...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadComponentPhoto(component.id, formData);
      toast.success("Photo uploaded successfully!");

      // Refresh photo list
      const freshPhotos = await getComponentPhotos(component.id);
      setPhotos(freshPhotos as GameComponentPhoto[]);
      setSelectedPhotoIndex(freshPhotos.length > 0 ? freshPhotos.length - 1 : 0);

      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveBackground = async () => {
    if (!component || !currentPhoto || !currentImageUrl) return;

    setIsProcessing(true);
    setProcessingStatus("Removing background...");

    try {
      const sourceBlob = await fetchPhotoBlob(currentImageUrl, currentPhoto.storage_path);
      const resultBlob = await removeBackgroundInBrowser(sourceBlob);

      const formData = new FormData();
      formData.append("file", resultBlob, "bg-removed.png");

      await replaceComponentPhotoWithBuffer(currentPhoto.id, component.id, formData);

      // Update cache bust timestamp locally
      const now = new Date().toISOString();
      setPhotos((prev) =>
        prev.map((p, idx) =>
          idx === selectedPhotoIndex ? { ...p, image_updated_at: now } : p
        )
      );

      toast.success("Background removed successfully!");
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove background");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleApplyCrop = async (croppedBlob: Blob) => {
    if (!component || !currentPhoto) return;

    setIsProcessing(true);
    setProcessingStatus("Saving crop...");

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "cropped.png");

      await replaceComponentPhotoWithBuffer(currentPhoto.id, component.id, formData);

      const now = new Date().toISOString();
      setPhotos((prev) =>
        prev.map((p, idx) =>
          idx === selectedPhotoIndex ? { ...p, image_updated_at: now } : p
        )
      );

      toast.success("Image cropped successfully!");
      setShowCropDialog(false);
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to crop image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleApplyErase = async (erasedBlob: Blob) => {
    if (!component || !currentPhoto) return;

    setIsProcessing(true);
    setProcessingStatus("Saving erased image...");

    try {
      const formData = new FormData();
      formData.append("file", erasedBlob, "erased.png");

      await replaceComponentPhotoWithBuffer(currentPhoto.id, component.id, formData);

      const now = new Date().toISOString();
      setPhotos((prev) =>
        prev.map((p, idx) =>
          idx === selectedPhotoIndex ? { ...p, image_updated_at: now } : p
        )
      );

      toast.success("Image updated successfully!");
      setShowEraserDialog(false);
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleRotate = async () => {
    if (!component || !currentPhoto || !currentImageUrl) return;

    setIsProcessing(true);
    setProcessingStatus("Rotating image...");

    try {
      const sourceBlob = await fetchPhotoBlob(currentImageUrl, currentPhoto.storage_path);
      const rotatedBlob = await rotateImageBlob(sourceBlob, 90);

      const formData = new FormData();
      formData.append("file", rotatedBlob, "rotated.png");

      await replaceComponentPhotoWithBuffer(currentPhoto.id, component.id, formData);

      const now = new Date().toISOString();
      setPhotos((prev) =>
        prev.map((p, idx) =>
          idx === selectedPhotoIndex ? { ...p, image_updated_at: now } : p
        )
      );

      toast.success("Image rotated 90°!");
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleDeletePhoto = async () => {
    if (!component || !photoToDelete) return;

    setIsDeleting(true);
    try {
      await deleteComponentPhoto(photoToDelete.id, component.id);
      toast.success("Photo deleted");

      const remaining = photos.filter((p) => p.id !== photoToDelete.id);
      setPhotos(remaining);
      setSelectedPhotoIndex((prev) =>
        prev >= remaining.length ? Math.max(0, remaining.length - 1) : prev
      );
      setPhotoToDelete(null);

      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!component) return null;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="p-0 bg-card border-primary/40 text-foreground overflow-hidden shadow-2xl transition-all duration-300"
          style={
            galleryZoomed
              ? { width: "95vw", maxWidth: "95vw", maxHeight: "95vh" }
              : { width: "min(960px, calc(100vw - 2rem))", maxWidth: "960px" }
          }
        >
          <DialogTitle className="sr-only">
            Component Photos: {component.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Game component photo viewer, gallery carousel, and image editing tools
          </DialogDescription>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-col h-full max-h-[92vh]">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-background/80 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="p-1.5 bg-primary/10 rounded border border-primary/30 text-primary shrink-0">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                    {component.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {photos.length > 0 ? (
                      <>
                        Photo {selectedPhotoIndex + 1} of {photos.length}
                      </>
                    ) : (
                      "No Photos Yet"
                    )}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1 shrink-0">
                {photos.length > 0 && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleZoomIn}
                          disabled={imageZoom >= 4}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom in</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleZoomOut}
                          disabled={imageZoom <= 1}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom out</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setGalleryZoomed((z) => !z)}
                        >
                          {galleryZoomed ? (
                            <Minimize2 className="h-4 w-4" />
                          ) : (
                            <Maximize2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {galleryZoomed ? "Reduce size" : "Expand size"}
                      </TooltipContent>
                    </Tooltip>

                    <div className="h-4 w-px bg-border/60 mx-1" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleRemoveBackground}
                          disabled={isProcessing}
                        >
                          {isProcessing && processingStatus.includes("background") ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove background</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setShowCropDialog(true)}
                          disabled={isProcessing}
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Crop photo</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setShowEraserDialog(true)}
                          disabled={isProcessing}
                        >
                          <Eraser className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eraser tool</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleRotate}
                          disabled={isProcessing}
                        >
                          {isProcessing && processingStatus.includes("Rotating") ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rotate 90°</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPhotoToDelete(currentPhoto)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete this photo</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {/* Add Photo Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => !isProcessing && fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="h-8 px-2.5 ml-1 border-primary/40 hover:border-primary text-xs font-bold uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/10 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Add Photo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upload new photo for this component</TooltipContent>
                </Tooltip>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main Carousel Viewer Area */}
            <div className="relative flex-1 bg-black/80 flex items-center justify-center overflow-hidden min-h-[350px] sm:min-h-[460px]">
              {/* Checkerboard Pattern for transparent backgrounds */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] pointer-events-none" />

              {photos.length > 0 && currentImageUrl ? (
                <>
                  <div
                    className="relative w-full h-full flex items-center justify-center overflow-hidden select-none p-4"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                      cursor: imageZoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                        transition: isDragging ? "none" : "transform 0.2s ease-out",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentImageUrl}
                        alt={`${component.name} photo ${selectedPhotoIndex + 1}`}
                        className="max-h-[70vh] max-w-[90%] object-contain drop-shadow-2xl rounded"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Previous Photo Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/80 hover:bg-background text-foreground border border-border/60 shadow-lg backdrop-blur disabled:opacity-20 transition-all z-20"
                    onClick={goToPrevious}
                    disabled={selectedPhotoIndex === 0}
                    title="Previous photo (Arrow Left)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  {/* Next Photo Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/80 hover:bg-background text-foreground border border-border/60 shadow-lg backdrop-blur disabled:opacity-20 transition-all z-20"
                    onClick={goToNext}
                    disabled={selectedPhotoIndex === photos.length - 1}
                    title="Next photo (Arrow Right)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>

                  {/* Counter Pill */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-primary/30 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider shadow-md text-primary z-20">
                    {selectedPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              ) : (
                /* Empty State: Prompt to upload first photo */
                <div
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-8 m-6 border-2 border-dashed border-primary/30 hover:border-primary rounded-xl cursor-pointer transition-all bg-primary/5 hover:bg-primary/10 text-center max-w-md"
                >
                  <div className="p-4 bg-primary/10 rounded-full border border-primary/30 text-primary">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">No photos yet</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Click to upload the first photo for <strong>{component.name}</strong>.
                      Supports PNG, JPG, or WEBP.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/40 hover:border-primary text-primary mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Upload Photo
                  </Button>
                </div>
              )}

              {/* Loading Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-primary animate-in fade-in-50 duration-150">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <span className="text-sm font-semibold tracking-wide text-foreground">
                    {processingStatus || "Processing photo..."}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Photo Thumbnails Strip */}
            {photos.length > 0 && (
              <div className="border-t border-border/50 bg-background/90 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {photos.map((photo, idx) => {
                    const thumbRaw = getR2PublicUrl(photo.storage_path);
                    const thumbUrl = getPhotoImageUrl(thumbRaw, photo.image_updated_at);
                    const isSelected = idx === selectedPhotoIndex;

                    return (
                      <button
                        key={photo.id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedPhotoIndex(idx);
                          resetZoom();
                        }}
                        className={`relative h-14 w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all p-0.5 bg-black/40 ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 scale-105"
                            : "border-border/60 hover:border-primary/50 opacity-70 hover:opacity-100"
                        }`}
                        title={`View photo ${idx + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl}
                          alt={`${component.name} thumbnail ${idx + 1}`}
                          className="h-full w-full object-contain rounded-sm"
                        />
                      </button>
                    );
                  })}

                  {/* Add Photo Thumbnail Button in strip */}
                  <button
                    type="button"
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="h-14 w-14 shrink-0 rounded-md border-2 border-dashed border-primary/40 hover:border-primary flex flex-col items-center justify-center text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                    title="Add another photo"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[9px] font-bold uppercase mt-0.5">Add</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent className="bg-card border-destructive/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Photo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo of <strong>{component.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeletePhoto();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Photo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reusable Image Crop Dialog */}
      {showCropDialog && currentImageUrl && (
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageUrl={currentImageUrl}
          title={`Crop Photo: ${component.name}`}
          onApplyCrop={handleApplyCrop}
        />
      )}

      {/* Reusable Image Eraser Dialog */}
      {showEraserDialog && currentImageUrl && (
        <ImageEraserDialog
          open={showEraserDialog}
          onOpenChange={setShowEraserDialog}
          imageUrl={currentImageUrl}
          title={`Erase Photo: ${component.name}`}
          onApplyErase={handleApplyErase}
        />
      )}
    </TooltipProvider>
  );
}
