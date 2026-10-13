"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  Crop,
  Eraser,
  RotateCw,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { ImageEraserDialog } from "@/components/ui/image-eraser-dialog";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import { fetchPhotoBlob, getPhotoImageUrl } from "@/lib/photos";
import { getR2PublicUrl } from "@/lib/r2";
import { rotateImageBlob } from "@/lib/image-transform";
import {
  uploadComponentImage,
  replaceComponentImageWithBuffer,
  deleteComponentImage,
} from "@/app/actions/game-components";
import type { GameComponent } from "@/types";
import { toast } from "sonner";

interface GameComponentPhotoDialogProps {
  component: GameComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GameComponentPhotoDialog({
  component,
  open,
  onOpenChange,
  onSuccess,
}: GameComponentPhotoDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showEraserDialog, setShowEraserDialog] = useState(false);

  if (!component) return null;

  const rawUrl = component.image_storage_path ? getR2PublicUrl(component.image_storage_path) : null;
  const currentImageUrl = rawUrl ? getPhotoImageUrl(rawUrl, component.image_updated_at) : null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadComponentImage(component.id, formData);
      toast.success("Component image uploaded successfully!");
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveBackground = async () => {
    if (!currentImageUrl || !component.image_storage_path) return;

    setIsProcessing(true);
    setProcessingStatus("Removing background...");

    try {
      const sourceBlob = await fetchPhotoBlob(currentImageUrl, component.image_storage_path);
      const resultBlob = await removeBackgroundInBrowser(sourceBlob);

      const formData = new FormData();
      formData.append("file", resultBlob, "bg-removed.png");

      await replaceComponentImageWithBuffer(component.id, formData);
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
    setIsProcessing(true);
    setProcessingStatus("Saving crop...");

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "cropped.png");

      await replaceComponentImageWithBuffer(component.id, formData);
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
    setIsProcessing(true);
    setProcessingStatus("Saving erased image...");

    try {
      const formData = new FormData();
      formData.append("file", erasedBlob, "erased.png");

      await replaceComponentImageWithBuffer(component.id, formData);
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
    if (!currentImageUrl || !component.image_storage_path) return;

    setIsProcessing(true);
    setProcessingStatus("Rotating image...");

    try {
      const sourceBlob = await fetchPhotoBlob(currentImageUrl, component.image_storage_path);
      const rotatedBlob = await rotateImageBlob(sourceBlob, 90);

      const formData = new FormData();
      formData.append("file", rotatedBlob, "rotated.png");

      await replaceComponentImageWithBuffer(component.id, formData);
      toast.success("Image rotated!");
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate image");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm("Are you sure you want to delete this component photo?")) return;

    setIsProcessing(true);
    setProcessingStatus("Deleting image...");

    try {
      await deleteComponentImage(component.id);
      toast.success("Photo deleted");
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Component Photo: {component.name}
            </DialogTitle>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="space-y-4 py-2">
            {currentImageUrl ? (
              <div className="space-y-4">
                {/* Image Preview Container */}
                <div className="relative aspect-video max-h-[320px] rounded-lg border border-primary/20 bg-black/60 flex items-center justify-center overflow-hidden shadow-inner p-2">
                  {/* Checkerboard background for transparent images */}
                  <div className="absolute inset-0 opacity-15 bg-[linear-gradient(45deg,#444_25%,transparent_25%),linear-gradient(-45deg,#444_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#444_75%),linear-gradient(-45deg,transparent_75%,#444_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImageUrl}
                    alt={component.name}
                    className="relative z-10 max-h-full max-w-full object-contain rounded"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 z-20 bg-black/70 flex flex-col items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-xs font-semibold">{processingStatus}</span>
                    </div>
                  )}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveBackground}
                      disabled={isProcessing}
                      className="border-primary/30 hover:border-primary text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      Remove BG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCropDialog(true)}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <Crop className="h-3.5 w-3.5 mr-1.5" />
                      Crop
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEraserDialog(true)}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <Eraser className="h-3.5 w-3.5 mr-1.5" />
                      Erase
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotate}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                      Rotate
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Replace
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteImage}
                      disabled={isProcessing}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/30 hover:border-primary rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10 text-center"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm font-semibold">{processingStatus}</span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Upload Component Photo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        PNG, JPG, or WEBP. You can crop, erase, and remove backgrounds anytime.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cropper Modal */}
      {showCropDialog && currentImageUrl && (
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageUrl={currentImageUrl}
          title={`Crop Component: ${component.name}`}
          onApplyCrop={handleApplyCrop}
        />
      )}

      {/* Eraser Modal */}
      {showEraserDialog && currentImageUrl && (
        <ImageEraserDialog
          open={showEraserDialog}
          onOpenChange={setShowEraserDialog}
          imageUrl={currentImageUrl}
          title={`Erase Component: ${component.name}`}
          onApplyErase={handleApplyErase}
        />
      )}
    </>
  );
}
