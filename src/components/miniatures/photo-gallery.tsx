"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Eraser,
  Crop,
  RotateCw,
  Loader2,
  GripVertical,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getR2PublicUrl } from "@/lib/r2";
import {
  deleteMiniaturePhoto,
  replacePhotoWithImage,
  reorderMiniaturePhotos,
} from "@/app/actions/photos";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { rotateImageBlob } from "@/lib/image-transform";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPhotoImageUrl, fetchPhotoBlob } from "@/lib/photos";

interface Photo {
  id: string;
  storage_path: string;
  caption?: string;
  uploaded_at?: string | null;
  image_updated_at?: string | null;
  display_order?: number | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  miniatureName: string;
  /** When set (e.g. on dashboard detail page), enables "Remove background" actions */
  miniatureId?: string;
}

export function PhotoGallery({ photos, miniatureName, miniatureId }: PhotoGalleryProps) {
  const [items, setItems] = useState<Photo[]>(photos);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isRemovingAllBg, setIsRemovingAllBg] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Drag & drop reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const dragOccurredRef = useRef(false);

  const router = useRouter();

  // Keep items in sync when incoming photos change
  useEffect(() => {
    setItems(photos);
  }, [photos]);

  const persistOrder = async (newOrder: Photo[]) => {
    if (!miniatureId) return;
    setIsReordering(true);
    try {
      const photoIds = newOrder.map((p) => p.id);
      const result = await reorderMiniaturePhotos(miniatureId, photoIds);
      if (!result.success) {
        toast.error(result.error || "Failed to save photo order");
        setItems(photos);
      } else {
        toast.success("Photo order updated");
        router.refresh();
      }
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to save photo order");
      setItems(photos);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!miniatureId || isReordering) {
      e.preventDefault();
      return;
    }
    dragOccurredRef.current = false;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      dragOccurredRef.current = false;
    }, 150);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    dragOccurredRef.current = true;
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    await persistOrder(updated);
  };

  const handleMoveItem = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setItems(updated);
    await persistOrder(updated);
  };

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setLightboxZoomed(false);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
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

  const handleDelete = async () => {
    if (!photoToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMiniaturePhoto(photoToDelete.id, photoToDelete.storage_path);
      toast.success("Photo deleted successfully");
      setItems((prev) => prev.filter((p) => p.id !== photoToDelete.id));
      setPhotoToDelete(null);
      setSelectedIndex(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveBackground = async (photoId: string, storagePath: string) => {
    setIsRemovingBg(true);
    try {
      const publicUrl = getR2PublicUrl(storagePath);
      const blob = await fetchPhotoBlob(publicUrl, storagePath);
      const resultBlob = await removeBackgroundInBrowser(blob);
      const formData = new FormData();
      formData.append("file", resultBlob, "image.png");
      const result = await replacePhotoWithImage(photoId, formData);
      if (result.success) {
        toast.success("Background removed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove background");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleRotate = async (photoId: string, storagePath: string) => {
    if (isRotating || isRemovingBg) return;
    setIsRotating(true);
    try {
      const publicUrl = getR2PublicUrl(storagePath);
      const blob = await fetchPhotoBlob(publicUrl, storagePath);
      const rotatedBlob = await rotateImageBlob(blob, 90);
      const formData = new FormData();
      const ext = rotatedBlob.type === "image/png" ? "png" : "jpg";
      formData.append("file", rotatedBlob, `image.${ext}`);
      const result = await replacePhotoWithImage(photoId, formData);
      if (result.success) {
        toast.success("Photo rotated 90°");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate photo");
    } finally {
      setIsRotating(false);
    }
  };

  const handleApplyCrop = async (croppedBlob: Blob) => {
    if (selectedIndex === null) return;
    const photo = items[selectedIndex];
    if (!photo) return;
    try {
      const ext = croppedBlob.type === "image/png" ? "png" : "webp";
      const formData = new FormData();
      formData.append("file", croppedBlob, `image.${ext}`);
      const result = await replacePhotoWithImage(photo.id, formData);
      if (result.success) {
        toast.success("Photo cropped");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to crop photo");
    }
  };

  const handleRemoveAllBackgrounds = async () => {
    if (!miniatureId) return;
    setIsRemovingAllBg(true);
    let processed = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const photo = items[i];
        try {
          const publicUrl = getR2PublicUrl(photo.storage_path);
          const blob = await fetchPhotoBlob(publicUrl, photo.storage_path);
          const resultBlob = await removeBackgroundInBrowser(blob);
          const formData = new FormData();
          formData.append("file", resultBlob, "image.png");
          const result = await replacePhotoWithImage(photo.id, formData);
          if (result.success) processed++;
        } catch {
          // skip failed photo
        }
      }
      toast.success(
        processed ? `Background removed from ${processed} photo(s)` : "Could not process any photos"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove backgrounds");
    } finally {
      setIsRemovingAllBg(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <p className="text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {miniatureId && items.length > 1 && (
            <span className="inline-flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded text-xs font-medium border border-border/50">
              <GripVertical className="h-3.5 w-3.5 text-primary" />
              <span>Drag photos to reorder</span>
            </span>
          )}
          {isReordering && (
            <span className="inline-flex items-center gap-1.5 text-primary text-xs font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving order...</span>
            </span>
          )}
        </div>

        {miniatureId && items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAllBackgrounds}
            disabled={isRemovingAllBg || isReordering}
          >
            {isRemovingAllBg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRemovingAllBg ? "Removing backgrounds..." : "Remove backgrounds from all photos"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((photo, index) => {
          const publicUrl = getR2PublicUrl(photo.storage_path);
          const imageUrl = getPhotoImageUrl(publicUrl, photo.image_updated_at);
          const isLocalSupabase =
            publicUrl.includes("127.0.0.1") || publicUrl.includes("localhost");
          const isDragged = draggedIndex === index;
          const isDragTarget = dragOverIndex === index && draggedIndex !== index;
          const isCover = index === 0;

          return (
            <div
              key={photo.id}
              draggable={Boolean(miniatureId && !isReordering)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`group relative aspect-square rounded-lg overflow-hidden border transition-all duration-150 select-none bg-muted/20 ${
                isDragged
                  ? "opacity-35 scale-95 border-dashed border-primary ring-2 ring-primary"
                  : isDragTarget
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] border-primary shadow-lg"
                    : "border-border/60 hover:border-primary/80 shadow-sm"
              }`}
            >
              {/* Thumbnail button that opens Lightbox */}
              <button
                type="button"
                onClick={() => {
                  if (dragOccurredRef.current) return;
                  openLightbox(index);
                }}
                className="w-full h-full text-left relative focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden block"
                title={photo.caption || `${miniatureName} photo ${index + 1}`}
              >
                <Image
                  src={imageUrl}
                  alt={photo.caption || `${miniatureName} photo ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                  crossOrigin="anonymous"
                  unoptimized={isLocalSupabase}
                  draggable={false}
                />
              </button>

              {/* Order / Cover Badge (Top-Left) */}
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                {isCover ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-md">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Cover
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded bg-background/85 backdrop-blur text-foreground text-[10px] font-bold border border-border/50 font-mono shadow-md">
                    #{index + 1}
                  </span>
                )}
              </div>

              {/* Drag Handle (Top-Right) */}
              {miniatureId && items.length > 1 && (
                <div
                  className="absolute top-2 right-2 z-10 p-1 rounded bg-background/85 backdrop-blur border border-border/50 text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing opacity-80 group-hover:opacity-100 shadow-md"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
              )}

              {/* Accessible Reorder Controls (Bottom Bar on hover/focus) */}
              {miniatureId && items.length > 1 && (
                <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={index === 0 || isReordering}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(index, "left");
                    }}
                    title="Move earlier (left)"
                    className="h-6 w-6 rounded bg-background/90 backdrop-blur border border-border/60 shadow-md hover:bg-primary hover:text-primary-foreground disabled:opacity-20 pointer-events-auto transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={index === items.length - 1 || isReordering}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(index, "right");
                    }}
                    title="Move later (right)"
                    className="h-6 w-6 rounded bg-background/90 backdrop-blur border border-border/60 shadow-md hover:bg-primary hover:text-primary-foreground disabled:opacity-20 pointer-events-auto transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Dialog */}
      {selectedIndex !== null && items[selectedIndex] && (
        <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
          <DialogContent
            className="p-0"
            style={
              lightboxZoomed
                ? { width: "95vw", maxWidth: "95vw" }
                : { width: "min(896px, calc(100vw - 2rem))", maxWidth: "896px" }
            }
          >
            <DialogTitle className="sr-only">
              {items[selectedIndex].caption || `${miniatureName} photo ${selectedIndex + 1}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Photo gallery viewer and background removal
            </DialogDescription>
            <TooltipProvider>
              <div className="relative">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/80 backdrop-blur"
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
                        className="bg-background/80 backdrop-blur"
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
                        className="bg-background/80 backdrop-blur"
                        onClick={() => setLightboxZoomed((z) => !z)}
                      >
                        {lightboxZoomed ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {lightboxZoomed ? "Reduce size" : "Increase size"}
                    </TooltipContent>
                  </Tooltip>
                  {miniatureId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-background/80 backdrop-blur"
                          onClick={() =>
                            handleRemoveBackground(
                              items[selectedIndex].id,
                              items[selectedIndex].storage_path
                            )
                          }
                          disabled={isRemovingBg}
                        >
                          {isRemovingBg ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eraser className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove background</TooltipContent>
                    </Tooltip>
                  )}
                  {miniatureId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-background/80 backdrop-blur"
                          onClick={() => setIsCropDialogOpen(true)}
                          disabled={isRotating || isRemovingBg}
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Crop photo</TooltipContent>
                    </Tooltip>
                  )}
                  {miniatureId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-background/80 backdrop-blur"
                          onClick={() =>
                            handleRotate(items[selectedIndex].id, items[selectedIndex].storage_path)
                          }
                          disabled={isRotating || isRemovingBg}
                        >
                          {isRotating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rotate 90° clockwise</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setPhotoToDelete(items[selectedIndex])}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 backdrop-blur"
                    onClick={closeLightbox}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className={`relative w-full ${lightboxZoomed ? "h-[90vh]" : "h-[70vh]"} overflow-hidden`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: imageZoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
                >
                  <div
                    style={{
                      transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                      transition: isDragging ? "none" : "transform 0.2s ease-out",
                      width: "100%",
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    <Image
                      src={getPhotoImageUrl(
                        getR2PublicUrl(items[selectedIndex].storage_path),
                        items[selectedIndex].image_updated_at
                      )}
                      alt={
                        items[selectedIndex].caption ||
                        `${miniatureName} photo ${selectedIndex + 1}`
                      }
                      fill
                      sizes="(max-width: 1024px) 100vw, 896px"
                      className="object-contain"
                      priority
                      crossOrigin="anonymous"
                      unoptimized
                      draggable={false}
                    />
                  </div>
                </div>

                {items[selectedIndex].caption && (
                  <div className="p-4 bg-background border-t">
                    <p className="text-sm text-center">{items[selectedIndex].caption}</p>
                  </div>
                )}

                {/* Navigation */}
                {items.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={goToPrevious}
                      disabled={selectedIndex === 0}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={goToNext}
                      disabled={selectedIndex === items.length - 1}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-sm">
                  {selectedIndex + 1} / {items.length}
                </div>
              </div>
            </TooltipProvider>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reusable Image Crop Dialog */}
      {selectedIndex !== null && items[selectedIndex] && (
        <ImageCropDialog
          open={isCropDialogOpen}
          onOpenChange={setIsCropDialogOpen}
          imageUrl={getR2PublicUrl(items[selectedIndex].storage_path)}
          title="Crop Miniature Photo"
          onApplyCrop={handleApplyCrop}
        />
      )}
    </>
  );
}
