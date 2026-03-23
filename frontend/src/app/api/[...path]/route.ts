import { NextRequest, NextResponse } from "next/server";

// Read BACKEND_URL at module load time (runtime, not build time).
// Falls back to the docker-compose service name for local dev.
const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "") || "http://backend:8000";

async function proxyRequest(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = `${BACKEND_URL}/api/${path.join("/")}${request.nextUrl.search}`;

  // Forward all headers except `host` (would confuse the backend).
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Strip hop-by-hop headers that must not be forwarded.
      if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[proxy] failed to reach backend at ${targetUrl}:`, error);
    return NextResponse.json({ detail: "Service temporarily unavailable" }, { status: 503 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxyRequest(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxyRequest(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxyRequest(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxyRequest(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxyRequest(req, (await ctx.params).path);
}
