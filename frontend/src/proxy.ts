import { NextRequest, NextResponse } from "next/server";

// Paths accessible without authentication (prefix-matched)
const PUBLIC_PREFIXES = ["/login", "/register", "/pricing"];

/**
 * Build a redirect URL that always uses the correct public scheme.
 *
 * Railway (and Cloudflare) terminate TLS and forward plain HTTP to the
 * container, so request.nextUrl.protocol is "http:" internally. If we
 * redirect with that scheme the browser follows the http:// link, the
 * edge immediately 301s it back to https://, Next.js sees http:// again,
 * and we get an infinite redirect loop.
 *
 * Trusting x-forwarded-proto fixes this: we use the scheme the edge
 * advertises (https) rather than what the container sees (http).
 */
function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) url.protocol = forwarded + ":";
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals through
  if (
    pathname === "/" ||
    pathname === "/health" ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    return redirectTo(request, "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
