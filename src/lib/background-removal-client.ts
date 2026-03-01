"use client";

/**
 * Removes the background from an image in the browser using @imgly/background-removal.
 * No API key or quota; runs locally. First run may be slow while models download (~40–80MB, then cached).
 */
export async function removeBackgroundInBrowser(
  image: Blob | string
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(image);
}
