import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Accept, Content-Type, Authorization",
      "Access-Control-Expose-Headers":
        "Accept-Ranges, Content-Range, Content-Length, Content-Type, Content-Disposition, ETag",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol", { status: 400 });
    }

    const rangeHeader = request.headers.get("range");
    const upstreamHeaders: Record<string, string> = {};
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: upstreamHeaders,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstreamRes.headers.get("Content-Type") || "application/pdf"
    );

    // Ensure range request headers are preserved and exposed to browser / PDF.js
    const acceptRanges = upstreamRes.headers.get("Accept-Ranges") || "bytes";
    responseHeaders.set("Accept-Ranges", acceptRanges);

    if (upstreamRes.headers.get("Content-Range")) {
      responseHeaders.set("Content-Range", upstreamRes.headers.get("Content-Range")!);
    }
    if (upstreamRes.headers.get("Content-Length")) {
      responseHeaders.set("Content-Length", upstreamRes.headers.get("Content-Length")!);
    }
    if (upstreamRes.headers.get("ETag")) {
      responseHeaders.set("ETag", upstreamRes.headers.get("ETag")!);
    }

    // Set disposition: attachment if download is requested, or inline so browsers render inside iframes
    const isDownload = searchParams.get("download") === "true";
    const customFilename = searchParams.get("filename") || parsed.pathname.split("/").pop() || "document.pdf";
    const cleanFilename = customFilename.toLowerCase().endsWith(".pdf") ? customFilename : `${customFilename}.pdf`;
    responseHeaders.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(cleanFilename)}"`
    );

    // CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Accept-Ranges, Content-Range, Content-Length, Content-Type, Content-Disposition, ETag"
    );

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(msg, { status: 502 });
  }
}

