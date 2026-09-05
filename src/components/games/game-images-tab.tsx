"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ImageIcon,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  Eraser,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  getGameImageUploadUrl,
  saveGameImageRecord,
  uploadGameImageServerSide,
  replaceGameImageWithImage,
  deleteGameImage,
  type GameEntityType,
} from "@/app/actions/games";
import { isGameImageLink, type GameInfoLink } from "@/lib/games/game-details";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { getPhotoImageUrl, fetchPhotoBlob } from "@/lib/photos";
import { getR2PublicUrl } from "@/lib/r2";

interface GameImagesTabProps {
  entityType: GameEntityType;
  entityId: string;
  links: GameInfoLink[];
  gameTitle?: string;
}

export function GameImagesTab({
  entityType,
  entityId,
  links,
  gameTitle = "Game",
}: GameImagesTabProps) {
  const router = useRouter();

  // Filter image links
  const imageLinks = links.filter(isGameImageLink);

  // Upload dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [removeBgOnUpload, setRemoveBgOnUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Background removal state
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);

  // Lightbox & delete state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<GameInfoLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setUploadError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Auto caption from clean filename
      const clean = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setCaption(clean);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rej = fileRejections[0];
      if (rej.errors.some((e) => e.code === "file-too-large")) {
        setUploadError("File is too large. Maximum size is 15MB.");
      } else {
        setUploadError("Please upload a valid image (JPEG, PNG, or WebP).");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
  });

  const handleOpenDialog = (open: boolean) => {
    if (open) {
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      setRemoveBgOnUpload(false);
      setUploadError(null);
      setUploadProgress(null);
    }
    setDialogOpen(open);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an image to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let fileToUpload: File = selectedFile;

      if (removeBgOnUpload) {
        setUploadProgress("Removing background locally...");
        const resultBlob = await removeBackgroundInBrowser(selectedFile);
        fileToUpload = new File(
          [resultBlob],
          selectedFile.name.replace(/\.[^.]+$/, ".png") || "image.png",
          { type: "image/png" }
        );
      }

      setUploadProgress("Requesting upload ticket...");
      let uploadedDirectly = false;
      let storagePath = "";

      try {
        const presigned = await getGameImageUploadUrl(
          entityType,
          entityId,
          fileToUpload.name,
          fileToUpload.type || "image/jpeg"
        );

        setUploadProgress("Uploading image...");
        const putRes = await fetch(presigned.presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": fileToUpload.type || "image/jpeg",
          },
          body: fileToUpload,
        });

        if (putRes.ok) {
          storagePath = presigned.key;
          uploadedDirectly = true;
        }
      } catch (err) {
        console.warn("Direct R2 upload failed, trying server fallback:", err);
      }

      if (uploadedDirectly && storagePath) {
        setUploadProgress("Saving image record...");
        await saveGameImageRecord(entityType, entityId, {
          storagePath,
          caption: caption.trim() || null,
        });
      } else {
        setUploadProgress("Uploading via server fallback...");
        const formData = new FormData();
        formData.append("file", fileToUpload);
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }
        await uploadGameImageServerSide(entityType, entityId, formData);
      }

      toast.success("Image uploaded successfully!");
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveBackground = async (imageItem: GameInfoLink) => {
    setRemovingBgId(imageItem.id);
    try {
      toast.info("Removing background locally with AI...", { duration: 3000 });
      const publicUrl = imageItem.url || getR2PublicUrl(imageItem.storage_path);
      const blob = await fetchPhotoBlob(publicUrl, imageItem.storage_path || undefined);
      const resultBlob = await removeBackgroundInBrowser(blob);

      const formData = new FormData();
      formData.append("file", resultBlob, "image.png");

      const result = await replaceGameImageWithImage(entityType, entityId, imageItem.id, formData);

      if (result.success) {
        toast.success("Background removed successfully!");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove background";
      toast.error(msg);
    } finally {
      setRemovingBgId(null);
    }
  };

  const handleDelete = async () => {
    if (!imageToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGameImage(entityType, entityId, imageToDelete.id);
      toast.success("Image removed successfully");
      setImageToDelete(null);
      setSelectedIndex(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete image";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Lightbox navigation & zooming
  const closeLightbox = () => {
    setSelectedIndex(null);
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
    if (selectedIndex !== null && selectedIndex < imageLinks.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const currentLightboxImage = selectedIndex !== null ? imageLinks[selectedIndex] : null;

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-4 border-b border-primary/15 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Game Images & Artwork
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide mt-1">
            Box art, components, maps, and painted sets
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button
                className="btn-warhammer-primary font-bold uppercase text-xs tracking-wider h-8 px-3.5"
                size="sm"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload Image
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Game Image
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleUpload} className="space-y-4 pt-2">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/10"
                      : selectedFile
                        ? "border-primary/50 bg-primary/5"
                        : "border-primary/30 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <input {...getInputProps()} />
                  {preview ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-32 h-32 rounded border border-primary/30 overflow-hidden bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-xs font-bold text-foreground break-all">
                        {selectedFile?.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Click or drag to replace
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-10 w-10 text-primary/70" />
                      <p className="text-sm font-bold text-foreground">
                        Click to choose or drag an image
                      </p>
                      <p className="text-xs text-muted-foreground">JPEG, PNG, WebP up to 15MB</p>
                    </div>
                  )}
                </div>

                {/* Caption input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="image-caption"
                    className="text-xs font-bold uppercase tracking-wide text-foreground/90"
                  >
                    Caption{" "}
                    <span className="text-muted-foreground text-[10px] normal-case">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="image-caption"
                    placeholder="e.g. Board layout, Painted operatives, Card set"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-background border-primary/30 text-sm focus-visible:border-primary"
                  />
                </div>

                {/* Remove Background Option */}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="remove-bg"
                    checked={removeBgOnUpload}
                    onCheckedChange={(c) => setRemoveBgOnUpload(Boolean(c))}
                  />
                  <Label
                    htmlFor="remove-bg"
                    className="text-xs font-bold text-foreground/90 cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Remove background automatically before upload
                  </Label>
                </div>

                {/* Upload status / error */}
                {uploadError && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadProgress && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/30 rounded p-2.5">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={uploading}
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {imageLinks.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-primary/20 rounded-sm bg-black/20">
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <ImageIcon className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              No Images Uploaded Yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload box artwork, board layouts, cards, and miniature components for {gameTitle}.
              Background removal is powered directly in your browser.
            </p>
            <Button
              onClick={() => handleOpenDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload First Image
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {imageLinks.map((img, idx) => {
              const imageUrl = getPhotoImageUrl(
                img.url || getR2PublicUrl(img.storage_path),
                img.image_updated_at
              );
              const isRemovingThisBg = removingBgId === img.id;

              return (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-sm overflow-hidden border border-primary/20 hover:border-primary/60 bg-neutral-950/60 shadow-lg transition-all"
                >
                  {/* Image Display */}
                  <Image
                    src={imageUrl}
                    alt={img.caption || img.title || "Game photo"}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain p-1.5 transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                    onClick={() => setSelectedIndex(idx)}
                    unoptimized
                  />

                  {/* Gradient Overlay for controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                    <div className="flex justify-end gap-1 pointer-events-auto">
                      {/* Remove Background button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 bg-black/60 hover:bg-primary hover:text-black border border-primary/30"
                              disabled={isRemovingThisBg}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBackground(img);
                              }}
                            >
                              {isRemovingThisBg ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eraser className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove background</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Delete button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7 bg-black/60 hover:bg-destructive border border-destructive/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageToDelete(img);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete image</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Caption at bottom */}
                    {img.caption && (
                      <div className="pointer-events-auto">
                        <p className="text-[11px] font-bold text-foreground truncate drop-shadow">
                          {img.caption}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={Boolean(imageToDelete)}
          onOpenChange={(open) => !open && setImageToDelete(null)}
        >
          <AlertDialogContent className="bg-card border-primary/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary font-bold uppercase tracking-wider">
                Delete Image?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete this image and remove it from this game.
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

        {/* Fullscreen Interactive Lightbox */}
        <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
          <DialogContent
            className="sm:max-w-none p-0 bg-neutral-950/95 border-primary/40 flex flex-col overflow-hidden shadow-2xl"
            style={{
              width: "min(1150px, calc(100vw - 2rem))",
              maxWidth: "min(1150px, calc(100vw - 2rem))",
              height: "min(840px, calc(100vh - 3rem))",
              maxHeight: "min(840px, calc(100vh - 3rem))",
            }}
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">Game Image Lightbox</DialogTitle>
            <DialogDescription className="sr-only">
              Interactive viewer for game photos
            </DialogDescription>

            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-primary/20 z-10">
              <span className="text-xs font-bold text-primary uppercase tracking-wider shrink-0">
                {selectedIndex !== null ? `${selectedIndex + 1} of ${imageLinks.length}` : ""}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Zoom in / out */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setImageZoom((z) => Math.min(z + 0.5, 4))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom in</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setImageZoom((z) => Math.max(z - 0.5, 1))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom out</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Remove background icon-only */}
                {currentLightboxImage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-primary/30 hover:border-primary hover:bg-primary/10 text-primary"
                          disabled={removingBgId === currentLightboxImage.id}
                          onClick={() => handleRemoveBackground(currentLightboxImage)}
                        >
                          {removingBgId === currentLightboxImage.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eraser className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove background</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Delete */}
                {currentLightboxImage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setImageToDelete(currentLightboxImage)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete image</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary ml-1"
                  onClick={closeLightbox}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Caption on its own line */}
            {currentLightboxImage?.caption && (
              <div className="px-4 py-2 bg-black/60 border-b border-primary/15 text-center z-10">
                <p className="text-xs text-foreground/90 font-medium break-words max-w-3xl mx-auto">
                  {currentLightboxImage.caption}
                </p>
              </div>
            )}

            {/* Central Image Canvas */}
            <div
              className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                if (imageZoom > 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && imageZoom > 1) {
                  setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
            >
              {currentLightboxImage && (
                <div
                  style={{
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
                    transition: isDragging ? "none" : "transform 0.15s ease-out",
                  }}
                  className="relative w-full h-full max-h-[75vh]"
                >
                  <Image
                    src={getPhotoImageUrl(
                      currentLightboxImage.url || getR2PublicUrl(currentLightboxImage.storage_path),
                      currentLightboxImage.image_updated_at
                    )}
                    alt={currentLightboxImage.caption || "Game photo"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}

              {/* Prev / Next buttons */}
              {selectedIndex !== null && selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-primary border border-primary/30 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {selectedIndex !== null && selectedIndex < imageLinks.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-primary border border-primary/30 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
