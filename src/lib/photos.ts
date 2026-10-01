/**
 * Returns the cache-busted image URL when the file has been replaced (e.g. after background removal).
 * Appending ?v=timestamp forces the browser to fetch the new image instead of serving a cached one.
 */
export function getPhotoImageUrl(publicUrl: string, imageUpdatedAt?: string | null): string {
  if (!imageUpdatedAt) return publicUrl;
  const v = new Date(imageUpdatedAt).getTime();
  const sep = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${sep}v=${v}`;
}

/**
 * Loads a photo as a Blob for browser operations (like client-side background removal).
 *
 * Browsers cache standard <img> requests without CORS headers. If we subsequently
 * fetch() the same URL in 'cors' mode, the browser retrieves the cached non-CORS response
 * and fails with "Origin ... is not allowed by Access-Control-Allow-Origin. Status code: 200".
 *
 * To avoid this, we:
 * 1. Append a unique cache-busting timestamp + cors flag and fetch with cache: "no-store".
 * 2. If direct fetch fails (e.g. strict CORS/network restrictions), seamlessly fall back
 *    to the same-origin server endpoint (/api/photos/blob?path=...).
 */
export async function fetchPhotoBlob(publicUrl: string, storagePath?: string): Promise<Blob> {
  // Direct convert for data: or blob: URIs
  if (publicUrl.startsWith("data:") || publicUrl.startsWith("blob:")) {
    try {
      const res = await fetch(publicUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch {
      // fallback to network logic
    }
  }

  // 1. Direct fetch with CORS (uses browser HTTP cache for instant loading)
  try {
    const res = await fetch(publicUrl, {
      mode: "cors",
    });
    if (res.ok) {
      return await res.blob();
    }
  } catch {
    // Direct fetch failed, fallback to same-origin proxy
  }

  // 2. Fallback to same-origin API route (immune to browser CORS issues, cached and fast)
  const path = storagePath || publicUrl;
  if (path) {
    try {
      const proxyUrl = `/api/photos/blob?path=${encodeURIComponent(path)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch (err) {
      console.error("Server fallback fetch failed:", err);
    }
  }

  throw new Error("Failed to load image");
}

function extractKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}
