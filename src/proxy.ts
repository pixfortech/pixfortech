import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for the authenticated areas: no session cookie, no entry.
 * This only avoids rendering work for anonymous visitors. Real authorisation
 * happens server-side in the /portal and /admin layouts and in every service.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.getAll().some((c) => /(^|\.)session_token$/.test(c.name) || c.name.endsWith("session_data"));
  if (!hasSession && (pathname.startsWith("/portal") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
