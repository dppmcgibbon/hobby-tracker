"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2, Trash2, Image as ImageIcon, Edit3, BookOpen, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { rotateImageFile } from "@/lib/image-transform";
import {
  getGameCoverUploadUrl,
  saveGameCover,
  removeGameCover,
  updateGameDescription,
  uploadGameCoverServerSide,
  type GameEntityType,
} from "@/app/actions/games";
import { getR2PublicUrl } from "@/lib/r2";

interface GameEditDialogProps {
  entityType: GameEntityType;
  entityId: string;
  title: string;
  currentCoverImage?: string | null;
  currentDescription?: string | null;
  trigger?: React.ReactNode;
  triggerVariant?: "default" | "icon";
  mode?: "all" | "description" | "cover";
}

export function GameEditDialog({
  entityType,
  entityId,
  title,
  currentCoverImage,
  currentDescription,
  trigger,
  triggerVariant = "default",
  mode = "all",
}: GameEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(currentDescription || "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [markRemoveCover, setMarkRemoveCover] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDescription(currentDescription || "");
      setCoverFile(null);
      setCoverPreview(null);
      setMarkRemoveCover(false);
      setError(null);
    }
    setOpen(newOpen);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setCoverFile(file);
      setMarkRemoveCover(false);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const errors = rejection.errors;
      if (errors.some((e) => e.code === "file-too-large")) {
        setError("Image is too large. Maximum size is 12MB.");
      } else if (errors.some((e) => e.code === "file-invalid-type")) {
        setError("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      } else {
        setError("Failed to accept file. Please try another image.");
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
    maxSize: 12 * 1024 * 1024,
  });

  const handleClearSelectedFile = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleRotateCoverPreview = async () => {
    if (!coverFile || isRotating) return;
    setIsRotating(true);
    try {
      const rotatedFile = await rotateImageFile(coverFile, 90);
      setCoverFile(rotatedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(rotatedFile);
      toast.success("Cover rotated 90°");
    } catch {
      toast.error("Failed to rotate cover");
    } finally {
      setIsRotating(false);
    }
  };

  const handleRemoveExistingCover = () => {
    setMarkRemoveCover(true);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // 1. Handle Cover Upload if a new file is chosen and mode allows
      if (mode !== "description") {
        if (coverFile) {
          let uploaded = false;
          try {
            // Direct client-to-R2 upload
            const presigned = await getGameCoverUploadUrl(
              entityType,
              entityId,
              coverFile.name,
              coverFile.type || "image/jpeg"
            );

            const putRes = await fetch(presigned.presignedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": coverFile.type || "image/jpeg",
              },
              body: coverFile,
            });

            if (putRes.ok) {
              await saveGameCover(entityType, entityId, presigned.key);
              uploaded = true;
            }
          } catch (directErr) {
            console.warn("Direct R2 upload failed, trying server fallback:", directErr);
          }

          // Fallback to server action if direct PUT failed
          if (!uploaded) {
            const formData = new FormData();
            formData.append("file", coverFile);
            await uploadGameCoverServerSide(entityType, entityId, formData);
          }
        } else if (markRemoveCover && currentCoverImage) {
          // Remove existing cover
          await removeGameCover(entityType, entityId);
        }
      }

      // 2. Handle Description Update if mode allows
      if (mode !== "cover") {
        const originalDesc = (currentDescription || "").trim();
        const newDesc = description.trim();
        if (newDesc !== originalDesc) {
          await updateGameDescription(entityType, entityId, newDesc);
        }
      }

      toast.success(
        mode === "description"
          ? "Lore description updated!"
          : mode === "cover"
            ? "Cover artwork updated!"
            : "Game details updated successfully!"
      );
      router.refresh();
      setOpen(false);
    } catch (err: unknown) {
      console.error("Failed to save game details:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save details. Please try again.";
      setError(message);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const currentDisplayCoverUrl =
    currentCoverImage && !markRemoveCover ? getR2PublicUrl(currentCoverImage) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : triggerVariant === "icon" ? (
          <Button
            variant="outline"
            size="icon"
            className="border-primary/40 hover:border-primary hover:bg-primary/10 text-primary h-8 w-8"
            title={
              mode === "description"
                ? "Edit Text"
                : mode === "cover"
                  ? "Edit Cover"
                  : "Edit Details"
            }
            aria-label={
              mode === "description"
                ? "Edit Text"
                : mode === "cover"
                  ? "Edit Cover"
                  : "Edit Details"
            }
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5 text-primary" />
            {mode === "description"
              ? "Edit Text"
              : mode === "cover"
                ? "Edit Cover"
                : "Edit Details"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          "border-primary/30 warhammer-card max-h-[90vh] overflow-y-auto",
          mode === "description"
            ? "sm:max-w-xl"
            : mode === "cover"
              ? "sm:max-w-md"
              : "sm:max-w-2xl"
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-2">
            {mode === "description" ? (
              <>
                <BookOpen className="h-5 w-5 text-primary" />
                Edit About Text
              </>
            ) : mode === "cover" ? (
              <>
                <ImageIcon className="h-5 w-5 text-primary" />
                Edit Cover Artwork
              </>
            ) : (
              <>
                <Edit3 className="h-5 w-5 text-primary" />
                Edit {title}
              </>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {mode === "description"
              ? `Update the background lore and overview for ${title}`
              : mode === "cover"
                ? `Upload or change the box / book cover artwork for ${title}`
                : "Update the book/box cover artwork and lore description"}
          </p>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs rounded bg-destructive/15 text-destructive border border-destructive/30">
            {error}
          </div>
        )}

        <div className="space-y-6 py-2">
          {/* Cover Image Section */}
          {mode !== "description" && (
            <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>Book / Box Cover Image</span>
              <span className="text-[10px] text-muted-foreground font-normal normal-case">
                PNG, JPG, WebP up to 12MB
              </span>
            </Label>

            {/* Current Cover Preview / Replace */}
            {coverPreview ? (
              <div className="relative rounded border border-primary/40 bg-neutral-950/80 p-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="New cover preview"
                  className="w-20 h-28 object-cover rounded shadow border border-primary/30 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider truncate">
                    {coverFile?.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {coverFile ? `${(coverFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-1">Ready to upload</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRotateCoverPreview}
                    disabled={isRotating || saving}
                    title="Rotate 90° clockwise"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                  >
                    {isRotating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelectedFile}
                    disabled={isRotating || saving}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : currentDisplayCoverUrl ? (
              <div className="relative rounded border border-primary/30 bg-neutral-950/60 p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentDisplayCoverUrl}
                    alt="Current cover"
                    className="w-16 h-22 object-cover rounded shadow border border-primary/20 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Current Cover Artwork
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Custom Cover Image
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveExistingCover}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            ) : null}

            {/* Dropzone Upload */}
            {!coverPreview && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-primary/25 hover:border-primary/60 hover:bg-primary/5 bg-muted/10"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {isDragActive ? (
                      <Upload className="h-6 w-6 animate-bounce" />
                    ) : (
                      <ImageIcon className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {isDragActive
                        ? "Drop cover image here"
                        : currentDisplayCoverUrl
                          ? "Drag & drop to replace cover, or click to browse"
                          : "Drag & drop cover image, or click to browse"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Supports PNG, JPG, or WebP up to 12MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Description Text Section */}
          {mode !== "cover" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="game-description"
                  className="text-xs font-bold uppercase tracking-wider text-foreground"
                >
                  About The Game / Lore Description
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {description.length} characters
                </span>
              </div>
              <Textarea
                id="game-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter lore background, synopsis, setting details, or gameplay overview..."
                className={cn(
                  "resize-y bg-neutral-950/60 border-primary/30 focus-visible:ring-primary text-sm leading-relaxed",
                  mode === "description" ? "min-h-[240px]" : "min-h-[160px]"
                )}
              />
              <p className="text-[11px] text-muted-foreground">
                This text will be prominently displayed in the &quot;About The Game&quot; section on
                the detail page.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-primary/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="text-xs uppercase font-bold tracking-wider"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs uppercase font-bold tracking-wider"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
