"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteMiniaturePhoto } from "@/app/actions/photos";
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

interface Photo {
  id: string;
  storage_path: string;
  caption?: string;
  uploaded_at: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  miniatureName: string;
}

export function PhotoGallery({ photos, miniatureName }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
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

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <p className="text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => {
          const { data } = supabase.storage
            .from("miniature-photos")
            .getPublicUrl(photo.storage_path);

          const isLocalSupabase =
            data.publicUrl.includes("127.0.0.1") || data.publicUrl.includes("localhost");

          return (
            <button
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Image
                src={data.publicUrl}
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
          <DialogContent className="max-w-4xl p-0">
            <DialogTitle className="sr-only">
              {photos[selectedIndex].caption || `${miniatureName} photo ${selectedIndex + 1}`}
            </DialogTitle>
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex gap-2">
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

              <div className="relative w-full h-[70vh]">
                <Image
                  src={
                    supabase.storage
                      .from("miniature-photos")
                      .getPublicUrl(photos[selectedIndex].storage_path).data.publicUrl
                  }
                  alt={
                    photos[selectedIndex].caption || `${miniatureName} photo ${selectedIndex + 1}`
                  }
                  fill
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="object-contain"
                  priority
                  unoptimized
                />
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
