/**
 * Returns the cache-busted image URL when the file has been replaced (e.g. after background removal).
 * Appending ?v=timestamp forces the browser to fetch the new image instead of serving a cached one.
 */
export function getPhotoImageUrl(
  publicUrl: string,
  imageUpdatedAt?: string | null
): string {
  if (!imageUpdatedAt) return publicUrl;
  const v = new Date(imageUpdatedAt).getTime();
  const sep = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${sep}v=${v}`;
}
