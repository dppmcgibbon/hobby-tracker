import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { downloadR2Object } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");
    if (!path) {
      return new NextResponse("Missing photo path", { status: 400 });
    }

    const buffer = await downloadR2Object(path);
    const ext = path.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve photo blob:", error);
    return new NextResponse("Failed to load photo", { status: 500 });
  }
}
