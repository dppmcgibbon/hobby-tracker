"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Trash2, Maximize2, Minimize2, ZoomIn, ZoomOut, Eraser, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteMiniaturePhoto, replacePhotoWithImage } from "@/app/actions/photos";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
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
import { getPhotoImageUrl } from "@/lib/photos";

interface Photo {
  id: string;
  storage_path: string;
  caption?: string;
  uploaded_at?: string;
  image_updated_at?: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  miniatureName: string;
  /** When set (e.g. on dashboard detail page), enables "Remove background" actions */
  miniatureId?: string;
}

export function PhotoGallery({ photos, miniatureName, miniatureId }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isRemovingAllBg, setIsRemovingAllBg] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const supabase = createClient();
  const router = useRouter();

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
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
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
      const publicUrl = supabase.storage
        .from("miniature-photos")
        .getPublicUrl(storagePath).data.publicUrl;
      const res = await fetch(publicUrl);
      if (!res.ok) throw new Error("Failed to load image");
      const blob = await res.blob();
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

  const handleRemoveAllBackgrounds = async () => {
    if (!miniatureId) return;
    setIsRemovingAllBg(true);
    let processed = 0;
    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const publicUrl = supabase.storage
            .from("miniature-photos")
            .getPublicUrl(photo.storage_path).data.publicUrl;
          const res = await fetch(publicUrl);
          if (!res.ok) continue;
          const blob = await res.blob();
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
        processed
          ? `Background removed from ${processed} photo(s)`
          : "Could not process any photos"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove backgrounds");
    } finally {
      setIsRemovingAllBg(false);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <p className="text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      {miniatureId && photos.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAllBackgrounds}
            disabled={isRemovingAllBg}
          >
            {isRemovingAllBg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRemovingAllBg ? "Removing backgrounds..." : "Remove backgrounds from all photos"}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => {
          const publicUrl = supabase.storage
            .from("miniature-photos")
            .getPublicUrl(photo.storage_path).data.publicUrl;
          const imageUrl = getPhotoImageUrl(publicUrl, photo.image_updated_at);
          const isLocalSupabase =
            publicUrl.includes("127.0.0.1") || publicUrl.includes("localhost");

          return (
            <button
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Image
                src={imageUrl}
                alt={photo.caption || `${miniatureName} photo ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                loading="lazy"
                unoptimized={isLocalSupabase}
              />
            </button>
          );
        })}
      </div>

      {/* Lightbox Dialog */}
      {selectedIndex !== null && (
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
              {photos[selectedIndex].caption || `${miniatureName} photo ${selectedIndex + 1}`}
            </DialogTitle>
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
                      photos[selectedIndex].id,
                      photos[selectedIndex].storage_path
                    )
                  }
                        disabled={isRemovingBg}
                      >
                        {isRemovingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove background</TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setPhotoToDelete(photos[selectedIndex])}
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
                    src={getPhotoImageUrl(
                      supabase.storage
                        .from("miniature-photos")
                        .getPublicUrl(photos[selectedIndex].storage_path).data.publicUrl,
                      photos[selectedIndex].image_updated_at
                    )}
                    alt={
                      photos[selectedIndex].caption || `${miniatureName} photo ${selectedIndex + 1}`
                    }
                    fill
                    sizes="(max-width: 1024px) 100vw, 896px"
                    className="object-contain"
                    priority
                    unoptimized
                    draggable={false}
                  />
                </div>
              </div>

              {photos[selectedIndex].caption && (
                <div className="p-4 bg-background border-t">
                  <p className="text-sm text-center">{photos[selectedIndex].caption}</p>
                </div>
              )}

              {/* Navigation */}
              {photos.length > 1 && (
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
                    disabled={selectedIndex === photos.length - 1}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-sm">
                {selectedIndex + 1} / {photos.length}
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
    </>
  );
}
