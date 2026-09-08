/**
 * Rotates an image Blob or File by a given angle (default 90° clockwise) using an in-memory canvas.
 * Preserves PNG transparency if the source image is a PNG, otherwise outputs JPEG with high quality.
 */
export async function rotateImageBlob(
  source: Blob | File,
  degrees: 90 | 180 | 270 = 90
): Promise<Blob> {
  const blobUrl = URL.createObjectURL(source);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image for rotation"));
      image.src = blobUrl;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create canvas 2D context");
    }

    const rad = (degrees * Math.PI) / 180;
    const isRightAngle = degrees === 90 || degrees === 270;

    canvas.width = isRightAngle ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRightAngle ? img.naturalWidth : img.naturalHeight;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const isPng = source.type === "image/png" || source.type.includes("png");
    const outputType = isPng ? "image/png" : "image/jpeg";
    const quality = outputType === "image/jpeg" ? 0.92 : undefined;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("Failed to export rotated image to Blob"));
          }
        },
        outputType,
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Convenience helper to rotate a File and return a new File with the same name.
 */
export async function rotateImageFile(
  file: File,
  degrees: 90 | 180 | 270 = 90
): Promise<File> {
  const rotatedBlob = await rotateImageBlob(file, degrees);
  return new File([rotatedBlob], file.name, {
    type: rotatedBlob.type,
    lastModified: Date.now(),
  });
}
