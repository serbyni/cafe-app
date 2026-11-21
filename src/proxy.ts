import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import {
  PREVIEW_COOKIE,
  TABLE_COOKIE,
  TABLE_COOKIE_MAX_AGE,
  routeRequest,
  tableParam,
} from "@/lib/routing/route";

/**
 * Multi-tenant routing: picks the site from the Host header (see src/lib/routing).
 * <slug>.<root>/path is served by /tenant/<slug>/path; the URL in the browser does not change.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const previewParam = url.searchParams.get("cafe");
  const decision = routeRequest({
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    pathname: url.pathname,
    search: url.search,
    rootDomain: publicEnv().NEXT_PUBLIC_ROOT_DOMAIN,
    previewParam,
    previewCookie: request.cookies.get(PREVIEW_COOKIE)?.value,
  });

  if (decision.action === "next") {
    const res = NextResponse.next();
    if (previewParam === "") res.cookies.delete(PREVIEW_COOKIE); // ?cafe= → back to root
    return res;
  }

  // QR scan → <café>/menu?table=<code>: remember the table for this café (host-only cookie) and
  // continue on the clean URL, so the code is not kept in the address bar or shared links.
  const table = tableParam(url.searchParams);
  if (table !== null) {
    const clean = new URL(url);
    clean.searchParams.delete("table");
    const res = NextResponse.redirect(clean, 303);
    if (table) {
      res.cookies.set(TABLE_COOKIE, table, {
        path: "/",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "lax",
        maxAge: TABLE_COOKIE_MAX_AGE,
      });
    } else {
      res.cookies.delete(TABLE_COOKIE);
    }
    if (decision.action === "rewrite-and-remember") {
      res.cookies.set(PREVIEW_COOKIE, decision.slug, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 12,
      });
    }
    return res;
  }

  const res = NextResponse.rewrite(new URL(decision.path, url));
  if (decision.action === "rewrite-and-remember") {
    res.cookies.set(PREVIEW_COOKIE, decision.slug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
    });
  }
  return res;
}

export const config = {
  // Skip static assets and image optimisation.
  matcher: [
    // sw.js: the push service worker is a static file (same on every café host).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
