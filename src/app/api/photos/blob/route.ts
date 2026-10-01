import { NextRequest, NextResponse } from "next/server";
import { downloadR2Object, NEXT_PUBLIC_R2_PUBLIC_URL } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path") || searchParams.get("url");
    if (!path) {
      return new NextResponse("Missing photo path", { status: 400 });
    }

    let buffer: Buffer;
    let mimeType = "image/jpeg";

    const isExternalUrl =
      (path.startsWith("http://") || path.startsWith("https://")) &&
      (!NEXT_PUBLIC_R2_PUBLIC_URL || !path.startsWith(NEXT_PUBLIC_R2_PUBLIC_URL));

    if (isExternalUrl) {
      const res = await fetch(path);
      if (!res.ok) {
        return new NextResponse("Failed to fetch external photo", { status: res.status });
      }
      const contentType = res.headers.get("content-type");
      if (contentType) mimeType = contentType;
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = await downloadR2Object(path);
      const ext = path.split("?")[0].split(".").pop()?.toLowerCase();
      mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Failed to serve photo blob:", error);
    return new NextResponse("Failed to load photo", { status: 500 });
  }
}

