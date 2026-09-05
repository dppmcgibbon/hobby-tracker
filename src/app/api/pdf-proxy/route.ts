import { NextRequest, NextResponse } from "next/server";

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
    const headers: Record<string, string> = {};
    if (rangeHeader) {
      headers["range"] = rangeHeader;
    }

    const res = await fetch(targetUrl, { headers });
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "application/pdf");
    if (res.headers.get("Content-Range")) {
      responseHeaders.set("Content-Range", res.headers.get("Content-Range")!);
    }
    if (res.headers.get("Accept-Ranges")) {
      responseHeaders.set("Accept-Ranges", res.headers.get("Accept-Ranges")!);
    }
    if (res.headers.get("Content-Length")) {
      responseHeaders.set("Content-Length", res.headers.get("Content-Length")!);
    }
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(msg, { status: 502 });
  }
}
