"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, X, Trash2, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteMiniaturePhoto } from "@/app/actions/photos";
import { toast } from "sonner";
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

interface MiniaturePhoto {
  id: string;
  storage_path: string;
}

interface Miniature {
  id: string;
  name: string;
  miniature_photos: MiniaturePhoto[];
}

interface MiniaturePhotoDialogProps {
  miniatures: Miniature[];
  selectedMiniatureIndex: number | null;
  selectedPhotoIndex: number;
  onClose: () => void;
  onNavigate: (miniatureIndex: number, photoIndex: number) => void;
  onPhotoDeleted?: (miniatureIndex: number, photoIndex: number) => void;
}

export function MiniaturePhotoDialog({
  miniatures,
  selectedMiniatureIndex,
  selectedPhotoIndex,
  onClose,
  onNavigate,
  onPhotoDeleted,
}: MiniaturePhotoDialogProps) {
  const [galleryZoomed, setGalleryZoomed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [photoToDelete, setPhotoToDelete] = useState<MiniaturePhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  const selectedMiniature = selectedMiniatureIndex !== null ? miniatures[selectedMiniatureIndex] : null;

  if (!selectedMiniature || selectedMiniatureIndex === null) {
    return null;
  }

  const resetZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleClose = () => {
    setGalleryZoomed(false);
    resetZoom();
    onClose();
  };

  const goToPrevious = () => {
    if (selectedPhotoIndex > 0) {
      // Go to previous photo of same miniature
      onNavigate(selectedMiniatureIndex, selectedPhotoIndex - 1);
      resetZoom();
    } else if (selectedMiniatureIndex > 0) {
      // Go to previous miniature (only if it has photos)
      let prevIndex = selectedMiniatureIndex - 1;
      while (prevIndex >= 0) {
        if (miniatures[prevIndex].miniature_photos.length > 0) {
          onNavigate(prevIndex, miniatures[prevIndex].miniature_photos.length - 1);
          resetZoom();
          return;
        }
        prevIndex--;
      }
    }
  };

  const goToNext = () => {
    if (selectedPhotoIndex < selectedMiniature.miniature_photos.length - 1) {
      // Go to next photo of same miniature
      onNavigate(selectedMiniatureIndex, selectedPhotoIndex + 1);
      resetZoom();
    } else if (selectedMiniatureIndex < miniatures.length - 1) {
      // Go to next miniature (only if it has photos)
      let nextIndex = selectedMiniatureIndex + 1;
      while (nextIndex < miniatures.length) {
        if (miniatures[nextIndex].miniature_photos.length > 0) {
          onNavigate(nextIndex, 0);
          resetZoom();
          return;
        }
        nextIndex++;
      }
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
    if (!photoToDelete || selectedMiniatureIndex === null) return;

    setIsDeleting(true);
    try {
      await deleteMiniaturePhoto(photoToDelete.id, photoToDelete.storage_path);
      toast.success("Photo deleted successfully");
      setPhotoToDelete(null);
      onPhotoDeleted?.(selectedMiniatureIndex, selectedPhotoIndex);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent
        className="p-0"
        style={
          galleryZoomed
            ? { width: "95vw", maxWidth: "95vw" }
            : { width: "min(896px, calc(100vw - 2rem))", maxWidth: "896px" }
        }
      >
        <DialogTitle className="sr-only">
          {selectedMiniature.miniature_photos[selectedPhotoIndex]
            ? `${selectedMiniature.name} photo ${selectedPhotoIndex + 1}`
            : selectedMiniature.name}
        </DialogTitle>
        <TooltipProvider>
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/90"
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
                    className="bg-background/90"
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
                    className="bg-background/90"
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
                  {galleryZoomed ? "Reduce size" : "Increase size"}
                </TooltipContent>
              </Tooltip>
              {onPhotoDeleted && selectedMiniature.miniature_photos.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setPhotoToDelete(selectedMiniature.miniature_photos[selectedPhotoIndex])}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete photo</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/90"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Miniature Name */}
            <div className="absolute top-2 left-2 z-10 bg-background/90 px-3 py-1 rounded-sm">
              <p className="text-sm font-semibold">{selectedMiniature.name}</p>
            </div>

            {selectedMiniature.miniature_photos.length > 0 ? (
              <>
                <div
                  className={`relative w-full ${galleryZoomed ? "h-[90vh]" : "h-[70vh]"} overflow-hidden`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                  <div
                    style={{
                      transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={
                        supabase.storage
                          .from("miniature-photos")
                          .getPublicUrl(
                            selectedMiniature.miniature_photos[selectedPhotoIndex].storage_path
                          ).data.publicUrl
                      }
                      alt={`${selectedMiniature.name} photo ${selectedPhotoIndex + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 896px"
                      className="object-contain"
                      loading="eager"
                      unoptimized
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90"
                    onClick={goToPrevious}
                    disabled={selectedMiniatureIndex === 0 && selectedPhotoIndex === 0}
                    title="Previous photo or miniature"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90"
                    onClick={goToNext}
                    disabled={
                      selectedMiniatureIndex === miniatures.length - 1 &&
                      selectedPhotoIndex === selectedMiniature.miniature_photos.length - 1
                    }
                    title="Next photo or miniature"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 px-3 py-1 rounded-full text-sm">
                  {selectedPhotoIndex + 1} / {selectedMiniature.miniature_photos.length}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                No photos available
              </div>
            )}
          </div>
        </TooltipProvider>
      </DialogContent>

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
    </Dialog>
  );
}
