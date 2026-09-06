"use client";

interface PdfJsViewport {
  width: number;
  height: number;
}

interface PdfJsPage {
  getViewport(params: { scale: number }): PdfJsViewport;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: PdfJsViewport }): {
    promise: Promise<void>;
  };
}

interface PdfJsDocument {
  getPage(pageNumber: number): Promise<PdfJsPage>;
  destroy?: () => Promise<void>;
  numPages?: number;
}

interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy?: () => Promise<void>;
}

interface PdfJsGlobal {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument(params: {
    url: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
    standardFontDataUrl?: string;
    disableAutoFetch?: boolean;
    disableStream?: boolean;
    disableRange?: boolean;
    rangeChunkSize?: number;
  }): PdfJsLoadingTask;
}

// Global in-memory cache for rendered PDF cover images
const pdfCoverCache = new Map<string, string>();

let pdfjsPromise: Promise<PdfJsGlobal> | null = null;

/**
 * Loads Mozilla's PDF.js library into the browser.
 * Prefers the locally hosted vendor bundle in /vendor/pdfjs/,
 * with fallback to Cloudflare CDN if needed.
 */
export function loadPdfJs(): Promise<PdfJsGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF.js can only be loaded in the browser."));
  }

  const win = window as unknown as { pdfjsLib?: PdfJsGlobal };
  if (win.pdfjsLib) {
    return Promise.resolve(win.pdfjsLib);
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/pdfjs/pdf.min.js";
    script.async = true;

    script.onload = () => {
      const pdfjsLib = (window as unknown as { pdfjsLib?: PdfJsGlobal }).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
        resolve(pdfjsLib);
      } else {
        reject(new Error("pdfjsLib not found on window after loading."));
      }
    };

    script.onerror = () => {
      // Fallback to Cloudflare CDN if local vendor script fails
      const cdnScript = document.createElement("script");
      cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      cdnScript.async = true;

      cdnScript.onload = () => {
        const pdfjsLib = (window as unknown as { pdfjsLib?: PdfJsGlobal }).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(pdfjsLib);
        } else {
          reject(new Error("pdfjsLib CDN fallback failed."));
        }
      };

      cdnScript.onerror = () => {
        pdfjsPromise = null;
        reject(new Error("Failed to load PDF.js from local vendor and CDN fallback."));
      };

      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

/**
 * Renders the first page of a PDF document to a data URL (image/webp or image/jpeg).
 * Uses HTTP range requests so only the initial pages of large PDFs are fetched.
 */
export async function getPdfFirstPageDataUrl(
  pdfUrl: string,
  options?: { scale?: number; format?: "image/webp" | "image/jpeg"; quality?: number }
): Promise<string> {
  const { scale = 1.5, format = "image/webp", quality = 0.9 } = options || {};

  // Return cached result if available
  const cacheKey = `${pdfUrl}_${scale}_${format}_${quality}`;
  if (pdfCoverCache.has(cacheKey)) {
    return pdfCoverCache.get(cacheKey)!;
  }

  const pdfjsLib = await loadPdfJs();

  // If the URL is external (e.g. Cloudflare R2 or another domain),
  // route through our same-origin PDF proxy so HTTP Range headers are fully exposed to PDF.js.
  const isExternal =
    pdfUrl.startsWith("http://") ||
    pdfUrl.startsWith("https://");
  
  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
  const urlsToTry = isExternal ? [proxyUrl, pdfUrl] : [pdfUrl];

  let pdfDoc: PdfJsDocument | null = null;
  let lastError: unknown = null;

  for (const targetUrl of urlsToTry) {
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: targetUrl,
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/",
        disableAutoFetch: true,
        disableStream: true,
        rangeChunkSize: 65536,
      });

      pdfDoc = await loadingTask.promise;
      if (pdfDoc) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!pdfDoc) {
    throw lastError || new Error("Failed to load PDF document.");
  }

  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create canvas 2d context for PDF rendering.");
    }

    // White background for transparent PDF pages
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL(format, quality);
    } catch {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    pdfCoverCache.set(cacheKey, dataUrl);
    return dataUrl;
  } finally {
    // Release PDF worker memory
    try {
      await pdfDoc.destroy?.();
    } catch {
      // ignore destruction errors
    }
  }
}
