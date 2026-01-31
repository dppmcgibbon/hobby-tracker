"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { deleteMiniaturePhoto } from "@/app/actions/photos";
import { Trash2, X, ZoomIn } from "lucide-react";
import type { MiniaturePhoto } from "@/types";

interface PhotoGalleryProps {
  photos: MiniaturePhoto[];
}

const photoTypeLabels = {
  wip: "WIP",
  completed: "Completed",
  detail: "Detail",
};

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<MiniaturePhoto | null>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletePhotoId) return;

    const photo = photos.find((p) => p.id === deletePhotoId);
    if (!photo) return;

    setDeleting(true);
    try {
      await deleteMiniaturePhoto(photo.id, photo.storage_path);
      setDeletePhotoId(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete photo:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No photos yet. Upload your first photo above!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <div
              className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/miniature-photos/${photo.storage_path}`}
                alt={photo.caption || "Miniature photo"}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {photoTypeLabels[photo.photo_type as keyof typeof photoTypeLabels]}
              </Badge>
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setDeletePhotoId(photo.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {photo.caption && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{photo.caption}</p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/miniature-photos/${selectedPhoto.storage_path}`}
              alt={selectedPhoto.caption || "Miniature photo"}
              width={1200}
              height={1200}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {selectedPhoto.caption && (
            <div className="absolute bottom-4 left-4 right-4 text-white text-center">
              <p className="text-lg">{selectedPhoto.caption}</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
