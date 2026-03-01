const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";

/**
 * Returns true if background removal is available (API key is set).
 */
export function isBackgroundRemovalAvailable(): boolean {
  return Boolean(process.env.REMOVE_BG_API_KEY);
}

/**
 * Removes the background from an image buffer using the remove.bg API.
 * Returns PNG buffer with transparency, or null if the API key is not set
 * (callers should then upload the original image).
 *
 * @throws Error with user-friendly message on API errors (e.g. quota 402/429).
 */
export async function removeBackgroundFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer | null> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return null;
  }

  const form = new FormData();
  form.append("size", "auto");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  form.append("image_file", blob, `image.${ext}`);

  const response = await fetch(REMOVE_BG_API_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Background removal failed (${response.status})`;
    if (response.status === 402) {
      message = "Background removal quota exceeded. Free tier is limited (e.g. 50 images/month).";
    } else if (response.status === 429) {
      message = "Background removal rate limit exceeded. Please try again later.";
    } else if (response.status === 400 || response.status === 422) {
      message =
        "Image not suitable for removal (need clear subject e.g. miniature, product). Try another photo.";
      if (text) {
        try {
          const json = JSON.parse(text) as { error?: { message?: string } };
          if (json.error?.message) message = json.error.message;
        } catch {
          // use default
        }
      }
    } else if (text) {
      try {
        const json = JSON.parse(text) as { error?: { message?: string } };
        if (json.error?.message) message = json.error.message;
      } catch {
        // use default message
      }
    }
    console.error("[remove.bg]", response.status, text);
    throw new Error(message);
  }

  const arrayBuffer = await response.arrayBuffer();
  const out = Buffer.from(arrayBuffer);
  if (out.length === 0) {
    throw new Error("Background removal returned an empty image.");
  }
  return out;
}
