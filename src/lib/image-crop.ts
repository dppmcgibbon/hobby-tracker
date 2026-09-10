export interface CropRect {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

/**
 * Crops an image Blob or File according to percentage coordinates [0..100] using an in-memory canvas.
 * Preserves PNG transparency if the source image is PNG, otherwise defaults to WebP with JPEG fallback.
 */
export async function cropImageBlob(
  source: Blob | File,
  cropRect: CropRect,
  preferredType?: "image/webp" | "image/png" | "image/jpeg"
): Promise<Blob> {
  const blobUrl = URL.createObjectURL(source);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image for cropping"));
      image.src = blobUrl;
    });

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const sx = Math.max(0, Math.floor((cropRect.x / 100) * naturalWidth));
    const sy = Math.max(0, Math.floor((cropRect.y / 100) * naturalHeight));
    const sWidth = Math.min(naturalWidth - sx, Math.floor((cropRect.width / 100) * naturalWidth));
    const sHeight = Math.min(naturalHeight - sy, Math.floor((cropRect.height / 100) * naturalHeight));

    if (sWidth <= 0 || sHeight <= 0) {
      throw new Error("Invalid crop area selected.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = sWidth;
    canvas.height = sHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create canvas context");
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

    const isPng = source.type === "image/png" || source.type.includes("png");
    const outputType = preferredType || (isPng ? "image/png" : "image/webp");

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to jpeg if webp export fails on certain legacy browsers
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) resolve(fallbackBlob);
                else reject(new Error("Failed to export cropped image"));
              },
              "image/jpeg",
              0.92
            );
          }
        },
        outputType,
        outputType === "image/png" ? undefined : 0.92
      );
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Convenience helper to crop a File and return a new File with the same name.
 */
export async function cropImageFile(
  file: File,
  cropRect: CropRect
): Promise<File> {
  const croppedBlob = await cropImageBlob(file, cropRect);
  const ext = croppedBlob.type === "image/png" ? "png" : croppedBlob.type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([croppedBlob], name, {
    type: croppedBlob.type,
    lastModified: Date.now(),
  });
}
