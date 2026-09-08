"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Folder,
  FolderPlus,
  FolderArchive,
  Layers,
  GripVertical,
  MoveRight,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  getGameImageUploadUrl,
  saveGameImageRecord,
  uploadGameImageServerSide,
  replaceGameImageWithImage,
  deleteGameImage,
  updateGameImageAlbum,
  addGameImageAlbum,
  renameGameImageAlbum,
  deleteGameImageAlbum,
  type GameEntityType,
} from "@/app/actions/games";
import { isGameImageLink, type GameInfoLink } from "@/lib/games/game-details";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { getPhotoImageUrl, fetchPhotoBlob } from "@/lib/photos";
import { getR2PublicUrl } from "@/lib/r2";
import { rotateImageBlob, rotateImageFile } from "@/lib/image-transform";

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
  const imageLinks = useMemo(() => links.filter(isGameImageLink), [links]);

  // Extract custom albums from IMAGE_ALBUMS_CATALOG link entry
  const catalogEntry = links.find(
    (l) => (l.category as string)?.toUpperCase() === "IMAGE_ALBUMS_CATALOG"
  );
  const catalogAlbums: string[] = useMemo(() => {
    return Array.isArray(catalogEntry?.albums) ? catalogEntry.albums : [];
  }, [catalogEntry]);

  // Extract distinct albums from all images (defaulting missing album to "Games")
  const imageAlbums = useMemo(() => {
    return Array.from(
      new Set(imageLinks.map((img) => (img.album && img.album.trim()) || "Games"))
    );
  }, [imageLinks]);

  // Consolidated unique list of all albums: uses catalog if set, otherwise defaults to "Games", "Artwork"
  const allAlbums = useMemo(() => {
    const baseList = Array.isArray(catalogEntry?.albums)
      ? catalogEntry.albums.filter((a): a is string => Boolean(a && a.trim()))
      : ["Games", "Artwork"];
    const set = new Set<string>(baseList);
    for (const a of imageAlbums) {
      if (a && a.trim()) set.add(a.trim());
    }
    if (set.size === 0) set.add("Games");
    return Array.from(set);
  }, [catalogEntry, imageAlbums]);

  // Active album tab: default "Games"
  const [activeAlbum, setActiveAlbum] = useState<string>("Games");

  // Filtered images for currently active album
  const displayedImages = useMemo(() => {
    if (activeAlbum === "ALL") return imageLinks;
    return imageLinks.filter(
      (img) => ((img.album && img.album.trim()) || "Games").toLowerCase() === activeAlbum.toLowerCase()
    );
  }, [imageLinks, activeAlbum]);

  // Count helper
  const getAlbumCount = useCallback(
    (albumName: string) => {
      if (albumName === "ALL") return imageLinks.length;
      return imageLinks.filter(
        (img) => ((img.album && img.album.trim()) || "Games").toLowerCase() === albumName.toLowerCase()
      ).length;
    },
    [imageLinks]
  );

  // Drag & drop state for moving images between albums
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);
  const [isMovingImage, setIsMovingImage] = useState(false);

  // New Album Dialog State
  const [newAlbumDialogOpen, setNewAlbumDialogOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Rename & Delete Album State
  const [albumToRename, setAlbumToRename] = useState<string | null>(null);
  const [renameAlbumInput, setRenameAlbumInput] = useState<string>("");
  const [isRenamingAlbum, setIsRenamingAlbum] = useState<boolean>(false);
  const [albumToDeleteCustom, setAlbumToDeleteCustom] = useState<string | null>(null);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState<boolean>(false);

  // Upload dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadAlbum, setUploadAlbum] = useState<string>("Games");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [removeBgOnUpload, setRemoveBgOnUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Background removal and rotation state
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [isRotatingUpload, setIsRotatingUpload] = useState(false);

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
      setUploadAlbum(activeAlbum === "ALL" ? "Games" : activeAlbum);
    }
    setDialogOpen(open);
  };

  const handleMoveImage = async (imageId: string, targetAlbum: string) => {
    const targetImg = imageLinks.find((img) => img.id === imageId);
    if (!targetImg) return;
    const currentAlbum = (targetImg.album && targetImg.album.trim()) || "Games";
    if (currentAlbum.toLowerCase() === targetAlbum.toLowerCase()) return;

    setIsMovingImage(true);
    try {
      await updateGameImageAlbum(entityType, entityId, imageId, targetAlbum);
      toast.success(`Moved image to "${targetAlbum}"`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move image";
      toast.error(msg);
    } finally {
      setIsMovingImage(false);
      setDraggedImageId(null);
      setDragOverAlbum(null);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAlbumName.trim();
    if (!trimmed) return;
    if (allAlbums.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Album "${trimmed}" already exists.`);
      return;
    }

    setIsCreatingAlbum(true);
    try {
      await addGameImageAlbum(entityType, entityId, trimmed);
      toast.success(`Album "${trimmed}" created!`);
      setActiveAlbum(trimmed);
      setNewAlbumName("");
      setNewAlbumDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create album";
      toast.error(msg);
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleOpenRenameAlbum = (albumName: string) => {
    setAlbumToRename(albumName);
    setRenameAlbumInput(albumName);
  };

  const handleConfirmRenameAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumToRename) return;
    const trimmed = renameAlbumInput.trim();
    if (!trimmed) {
      toast.error("Album name cannot be empty");
      return;
    }
    if (trimmed.toLowerCase() === albumToRename.toLowerCase()) {
      setAlbumToRename(null);
      return;
    }
    setIsRenamingAlbum(true);
    try {
      await renameGameImageAlbum(entityType, entityId, albumToRename, trimmed);
      toast.success(`Renamed album to "${trimmed}"`);
      if (activeAlbum.toLowerCase() === albumToRename.toLowerCase()) {
        setActiveAlbum(trimmed);
      }
      setAlbumToRename(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename album";
      toast.error(msg);
    } finally {
      setIsRenamingAlbum(false);
    }
  };

  const handleConfirmDeleteAlbum = async () => {
    if (!albumToDeleteCustom) return;
    setIsDeletingAlbum(true);
    try {
      const res = await deleteGameImageAlbum(entityType, entityId, albumToDeleteCustom);
      toast.success(`Deleted album "${albumToDeleteCustom}"`);
      if (activeAlbum.toLowerCase() === albumToDeleteCustom.toLowerCase()) {
        setActiveAlbum(res.fallbackAlbum || "Games");
      }
      setAlbumToDeleteCustom(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete album";
      toast.error(msg);
    } finally {
      setIsDeletingAlbum(false);
    }
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
          album: uploadAlbum,
        });
      } else {
        setUploadProgress("Uploading via server fallback...");
        const formData = new FormData();
        formData.append("file", fileToUpload);
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }
        formData.append("album", uploadAlbum);
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

  const handleRotateImage = async (imageItem: GameInfoLink) => {
    setRotatingId(imageItem.id);
    try {
      toast.info("Rotating image 90°...", { duration: 2500 });
      const publicUrl = imageItem.url || getR2PublicUrl(imageItem.storage_path);
      const blob = await fetchPhotoBlob(publicUrl, imageItem.storage_path || undefined);
      const rotatedBlob = await rotateImageBlob(blob, 90);

      const formData = new FormData();
      const ext = rotatedBlob.type === "image/png" ? "png" : "jpg";
      formData.append("file", rotatedBlob, `image.${ext}`);

      const result = await replaceGameImageWithImage(entityType, entityId, imageItem.id, formData);

      if (result.success) {
        toast.success("Image rotated 90°");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rotate image";
      toast.error(msg);
    } finally {
      setRotatingId(null);
    }
  };

  const handleRotateUploadPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile || isRotatingUpload) return;
    setIsRotatingUpload(true);
    try {
      const rotatedFile = await rotateImageFile(selectedFile, 90);
      setSelectedFile(rotatedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(rotatedFile);
      toast.success("Preview rotated 90°");
    } catch {
      toast.error("Failed to rotate preview");
    } finally {
      setIsRotatingUpload(false);
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
    if (selectedIndex !== null && selectedIndex < displayedImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const currentLightboxImage =
    selectedIndex !== null ? displayedImages[selectedIndex] : null;

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-3 border-b border-primary/15 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
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
                      <div className="relative w-32 h-32 rounded border border-primary/30 overflow-hidden bg-black/40 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          disabled={isRotatingUpload}
                          onClick={handleRotateUploadPreview}
                          className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-black/80 hover:bg-primary hover:text-black border border-primary/40 text-primary shadow-md"
                          title="Rotate 90° clockwise"
                        >
                          {isRotatingUpload ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
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

                {/* Album Selection */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="upload-album-select"
                    className="text-xs font-bold uppercase tracking-wide text-foreground/90 flex items-center justify-between"
                  >
                    <span>Album / Category</span>
                    <span className="text-[10px] text-primary font-normal">
                      Default: Games
                    </span>
                  </Label>
                  <Select value={uploadAlbum} onValueChange={setUploadAlbum}>
                    <SelectTrigger id="upload-album-select" className="bg-background border-primary/30 text-xs">
                      <SelectValue placeholder="Select Album" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/30">
                      {allAlbums.map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <CardContent className="pt-2.5 space-y-4">
        {/* Albums Bar - Lightweight Pill Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {allAlbums.map((album) => {
              const count = getAlbumCount(album);
              const isActive = activeAlbum.toLowerCase() === album.toLowerCase();
              const isDragOver = dragOverAlbum?.toLowerCase() === album.toLowerCase();
              const isCustom =
                album.toLowerCase() !== "games" && album.toLowerCase() !== "artwork";

              return (
                <div
                  key={album}
                  className="relative group/album inline-flex items-center"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverAlbum !== album) setDragOverAlbum(album);
                  }}
                  onDragLeave={() => {
                    if (dragOverAlbum === album) setDragOverAlbum(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const imageId = e.dataTransfer.getData("text/plain") || draggedImageId;
                    setDragOverAlbum(null);
                    setDraggedImageId(null);
                    if (imageId) {
                      await handleMoveImage(imageId, album);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveAlbum(album)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
                      isDragOver &&
                        "bg-primary/30 border-primary text-primary ring-2 ring-primary/60 scale-105"
                    )}
                  >
                    <Folder className={cn("h-3 w-3", isActive ? "text-primary" : "text-muted-foreground/60")} />
                    <span>{album}</span>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums font-mono",
                        isActive ? "text-primary/90 font-bold" : "text-muted-foreground/50"
                      )}
                    >
                      {count}
                    </span>

                    {/* Subtle options menu trigger for Rename and Delete */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span
                          role="button"
                          title={`Options for "${album}"`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "p-0.5 rounded-full transition-all ml-0.5 text-muted-foreground hover:text-primary hover:bg-primary/20",
                            isActive
                              ? "opacity-80 hover:opacity-100"
                              : "opacity-0 group-hover/album:opacity-70 hover:!opacity-100"
                          )}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-card border-primary/30 min-w-36 z-50">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameAlbum(album);
                          }}
                          className="text-xs cursor-pointer flex items-center gap-2"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={allAlbums.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlbumToDeleteCustom(album);
                          }}
                          className="text-xs cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </button>
                </div>
              );
            })}

            {/* "All" pill */}
            <button
              type="button"
              onClick={() => setActiveAlbum("ALL")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                activeAlbum === "ALL"
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
              )}
            >
              <Layers className={cn("h-3 w-3", activeAlbum === "ALL" ? "text-primary" : "text-muted-foreground/60")} />
              <span>All</span>
              <span
                className={cn(
                  "text-[10px] tabular-nums font-mono",
                  activeAlbum === "ALL" ? "text-primary/90 font-bold" : "text-muted-foreground/50"
                )}
              >
                {imageLinks.length}
              </span>
            </button>
          </div>

          {/* New Album Trigger - Lightweight ghost chip */}
          <Dialog open={newAlbumDialogOpen} onOpenChange={setNewAlbumDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
              >
                <FolderPlus className="h-3 w-3" />
                <span>New Album</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-base font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-primary" />
                  New Album
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Create a custom album category for {gameTitle}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAlbum} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="album-name" className="text-xs font-bold uppercase tracking-wider">
                    Album Name
                  </Label>
                  <Input
                    id="album-name"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="e.g. Miniatures, Maps, Cards"
                    autoFocus
                    maxLength={30}
                    className="h-8 text-xs bg-neutral-900 border-primary/30"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewAlbumDialogOpen(false)}
                    disabled={isCreatingAlbum}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newAlbumName.trim() || isCreatingAlbum}
                    className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
                  >
                    {isCreatingAlbum ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
        ) : displayedImages.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverAlbum !== activeAlbum) setDragOverAlbum(activeAlbum);
            }}
            onDragLeave={() => {
              if (dragOverAlbum === activeAlbum) setDragOverAlbum(null);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              const imageId = e.dataTransfer.getData("text/plain") || draggedImageId;
              setDragOverAlbum(null);
              setDraggedImageId(null);
              if (imageId && activeAlbum !== "ALL") {
                await handleMoveImage(imageId, activeAlbum);
              }
            }}
            className={cn(
              "text-center py-12 px-4 border border-dashed rounded-sm transition-all",
              dragOverAlbum === activeAlbum
                ? "border-primary bg-primary/15 ring-2 ring-primary"
                : "border-primary/20 bg-black/20"
            )}
          >
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <FolderArchive className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Album "{activeAlbum}" is Empty
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Drag images from other albums onto "{activeAlbum}" or drop them here, or upload a new image directly to this album.
            </p>
            <Button
              onClick={() => handleOpenDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Image to {activeAlbum}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {displayedImages.map((img, idx) => {
              const imageUrl = getPhotoImageUrl(
                img.url || getR2PublicUrl(img.storage_path),
                img.image_updated_at
              );
              const isRemovingThisBg = removingBgId === img.id;
              const isBeingDragged = draggedImageId === img.id;

              return (
                <div
                  key={img.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", img.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedImageId(img.id);
                  }}
                  onDragEnd={() => {
                    setDraggedImageId(null);
                  }}
                  className={cn(
                    "group relative aspect-square rounded-sm overflow-hidden border bg-neutral-950/60 shadow-lg transition-all",
                    isBeingDragged
                      ? "opacity-30 border-dashed border-primary ring-2 ring-primary"
                      : "border-primary/20 hover:border-primary/60"
                  )}
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

                  {/* Drag Grip Indicator */}
                  <div
                    className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-80 transition-opacity p-1 rounded bg-black/70 border border-primary/30 text-primary pointer-events-none"
                    title="Drag to another album"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>

                  {/* Gradient Overlay for controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                    <div className="flex justify-end gap-1 pointer-events-auto">
                      {/* Move to Album Dropdown */}
                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-7 w-7 bg-black/60 hover:bg-primary hover:text-black border border-primary/30"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Folder className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Move to album</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenuContent align="end" className="bg-card border-primary/30 min-w-44 z-50">
                          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Move To Album
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-primary/20" />
                          {allAlbums.map((alb) => {
                            const isCurrent =
                              ((img.album && img.album.trim()) || "Games").toLowerCase() ===
                              alb.toLowerCase();
                            return (
                              <DropdownMenuItem
                                key={alb}
                                disabled={isCurrent || isMovingImage}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImage(img.id, alb);
                                }}
                                className={cn(
                                  "text-xs cursor-pointer flex items-center justify-between",
                                  isCurrent && "text-primary font-bold bg-primary/10"
                                )}
                              >
                                <span className="truncate">{alb}</span>
                                {isCurrent ? (
                                  <span className="text-[10px] opacity-70">Current</span>
                                ) : (
                                  <MoveRight className="h-3 w-3 opacity-60 ml-2" />
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>

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

                      {/* Rotate button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 bg-black/60 hover:bg-primary hover:text-black border border-primary/30"
                              disabled={isRemovingThisBg || rotatingId === img.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRotateImage(img);
                              }}
                            >
                              {rotatingId === img.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rotate 90° clockwise</TooltipContent>
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

                    {/* Bottom Metadata: Album badge + Caption */}
                    <div className="flex items-center justify-between gap-1.5 pointer-events-auto">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/80 border border-primary/30 text-primary font-medium truncate max-w-[50%]">
                        {img.album || "Games"}
                      </span>
                      {img.caption && (
                        <p className="text-[11px] font-bold text-foreground truncate drop-shadow text-right max-w-[50%]">
                          {img.caption}
                        </p>
                      )}
                    </div>
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
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {selectedIndex !== null ? `${selectedIndex + 1} of ${displayedImages.length}` : ""}
                </span>
                {currentLightboxImage && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary font-medium">
                    {currentLightboxImage.album || "Games"}
                  </span>
                )}
              </div>

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

                {/* Rotate 90° Clockwise */}
                {currentLightboxImage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-primary/30 hover:border-primary hover:bg-primary/10 text-primary"
                          disabled={rotatingId === currentLightboxImage.id || removingBgId === currentLightboxImage.id}
                          onClick={() => handleRotateImage(currentLightboxImage)}
                        >
                          {rotatingId === currentLightboxImage.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rotate 90° clockwise</TooltipContent>
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

              {selectedIndex !== null && selectedIndex < displayedImages.length - 1 && (
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

        {/* Rename Album Dialog */}
        <Dialog
          open={!!albumToRename}
          onOpenChange={(open) => {
            if (!open) setAlbumToRename(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-foreground">Rename Album</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Enter a new name for the &ldquo;{albumToRename}&rdquo; album. All images in this album will be updated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleConfirmRenameAlbum} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="rename-album-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Album Name
                </Label>
                <Input
                  id="rename-album-input"
                  value={renameAlbumInput}
                  onChange={(e) => setRenameAlbumInput(e.target.value)}
                  placeholder="e.g. Gameplay, Box Art..."
                  autoFocus
                  disabled={isRenamingAlbum}
                  className="bg-black/50 border-primary/30 focus:border-primary"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRenamingAlbum}
                  onClick={() => setAlbumToRename(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isRenamingAlbum || !renameAlbumInput.trim()}
                >
                  {isRenamingAlbum ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Renaming...
                    </>
                  ) : (
                    "Save Name"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Album Confirmation Dialog */}
        <AlertDialog
          open={!!albumToDeleteCustom}
          onOpenChange={(open) => {
            if (!open) setAlbumToDeleteCustom(null);
          }}
        >
          <AlertDialogContent className="bg-card border-destructive/40">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Delete Album &ldquo;{albumToDeleteCustom}&rdquo;?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-xs">
                This will remove the album from your list. Any images currently inside this album will be automatically moved to{" "}
                <span className="font-semibold text-primary">
                  &ldquo;{allAlbums.find((a) => a.toLowerCase() !== albumToDeleteCustom?.toLowerCase()) || "Games"}&rdquo;
                </span>
                . No images will be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel disabled={isDeletingAlbum}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingAlbum}
                onClick={handleConfirmDeleteAlbum}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeletingAlbum ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  "Delete Album"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
