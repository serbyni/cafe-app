import { isCafeSlug, parseHost } from "./host";

/** Internal path prefix of the café pages: <slug>.<root>/menu → /tenant/<slug>/menu. */
export const CAFE_ROUTE_PREFIX = "/tenant";
/** Rewrite target that renders the 404 page (no such route exists). */
export const NOT_FOUND_PATH = "/__not-found";
/** Cookie remembering the preview café on non-production hosts (Vercel previews). */
export const PREVIEW_COOKIE = "serbi_preview_cafe";
/** Cookie remembering the customer's table (host-only: one café). Set from ?table=<code>. */
export const TABLE_COOKIE = "serbi_table";
/** How long a scanned table is remembered (a visit, not forever). */
export const TABLE_COOKIE_MAX_AGE = 60 * 60 * 4;

/**
 * ?table=<code> from a QR scan: the code to remember (upper-case), "" to forget the table
 * (empty or invalid value), or null when the parameter is absent.
 */
export function tableParam(search: URLSearchParams): string | null {
  if (!search.has("table")) return null;
  const code = (search.get("table") ?? "").trim().toUpperCase();
  return /^[A-HJKMNP-Z2-9]{6}$/.test(code) ? code : "";
}

export type RouteDecision =
  | { action: "next" }
  | { action: "rewrite"; path: string }
  | { action: "rewrite-and-remember"; path: string; slug: string };

/**
 * What the proxy does with one request (pure, unit-tested).
 * - The internal /tenant/* paths are never reachable directly (always 404).
 * - Café host → rewrite to /tenant/<slug><path>; the visitor keeps seeing <slug>.<root>/<path>.
 * - Other hosts (previews): `?cafe=<slug>` (or the cookie it sets) shows that café, so preview
 *   deployments can be tested without DNS; `?cafe=` (empty) goes back to the root site.
 */
export function routeRequest(input: {
  host: string | null;
  pathname: string;
  search: string;
  rootDomain: string;
  previewParam?: string | null;
  previewCookie?: string | null;
}): RouteDecision {
  const { pathname, search } = input;
  if (pathname === CAFE_ROUTE_PREFIX || pathname.startsWith(`${CAFE_ROUTE_PREFIX}/`)) {
    return { action: "rewrite", path: NOT_FOUND_PATH };
  }

  const site = parseHost(input.host, input.rootDomain);
  const toCafe = (slug: string) =>
    `${CAFE_ROUTE_PREFIX}/${slug}${pathname === "/" ? "" : pathname}${search}`;

  switch (site.kind) {
    case "root":
      return { action: "next" };
    case "invalid":
      return { action: "rewrite", path: NOT_FOUND_PATH };
    case "cafe":
      return { action: "rewrite", path: toCafe(site.slug) };
    case "other": {
      const param = input.previewParam?.trim().toLowerCase();
      if (param !== undefined && param !== null && isCafeSlug(param)) {
        return { action: "rewrite-and-remember", path: toCafe(param), slug: param };
      }
      const cookie = input.previewCookie?.trim().toLowerCase();
      if (param === undefined || param === null) {
        if (cookie && isCafeSlug(cookie)) {
          return { action: "rewrite", path: toCafe(cookie) };
        }
      }
      return { action: "next" };
    }
  }
}
