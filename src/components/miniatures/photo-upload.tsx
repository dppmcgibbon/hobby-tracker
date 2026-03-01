"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadMiniaturePhoto } from "@/app/actions/photos";
import { Upload, X, Loader2 } from "lucide-react";

interface PhotoUploadProps {
  miniatureId: string;
  onSuccess?: () => void;
  /** When true, renders a compact dropzone suitable for inline/accordion use */
  compact?: boolean;
}

export function PhotoUpload({ miniatureId, onSuccess, compact }: PhotoUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState<string>("wip");
  const [removeBackground, setRemoveBackground] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const errors = rejection.errors;
      
      if (errors.some((e: any) => e.code === 'file-too-large')) {
        setError('File is too large. Maximum size is 12MB.');
      } else if (errors.some((e: any) => e.code === 'file-invalid-type')) {
        setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      } else if (errors.some((e: any) => e.code === 'too-many-files')) {
        setError('Too many files. Please upload only one image at a time.');
      } else {
        setError('File upload failed. Please try again.');
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
    maxSize: 12 * 1024 * 1024, // 12MB
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", caption);
      formData.append("photo_type", photoType);
      if (removeBackground) formData.append("remove_background", "true");

      await uploadMiniaturePhoto(miniatureId, formData);

      // Reset form
      setFile(null);
      setPreview(null);
      setCaption("");
      setPhotoType("wip");

      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            compact ? "p-4" : "p-8"
          } ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`mx-auto text-muted-foreground ${compact ? "h-8 w-8" : "h-12 w-12"}`} />
          <p className={`text-muted-foreground ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>
            {isDragActive ? "Drop the image here" : compact ? "Drop or click to upload" : "Drag & drop an image here, or click to select"}
          </p>
          {!compact && <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WebP (max 12MB)</p>}
        </div>
      ) : (
        <div className={compact ? "space-y-2" : "space-y-4"}>
          <div className={`relative ${compact ? "h-32" : "h-64"}`}>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
              unoptimized
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearFile}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!compact && (
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
            />
          </div>
          )}

          {!compact && (
          <div className="space-y-2">
            <Label htmlFor="photo_type">Photo Type</Label>
            <Select value={photoType} onValueChange={setPhotoType} disabled={uploading}>
              <SelectTrigger id="photo_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wip">Work in Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="detail">Detail Shot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {!compact && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remove_background"
              checked={removeBackground}
              onCheckedChange={(v) => setRemoveBackground(v === true)}
              disabled={uploading}
            />
            <Label htmlFor="remove_background" className="text-sm font-normal cursor-pointer">
              Remove background (uses remove.bg; free tier limited)
            </Label>
          </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full" size={compact ? "sm" : "default"}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>
      )}
    </div>
  );
}
