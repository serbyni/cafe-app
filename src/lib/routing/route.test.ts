import { describe, expect, it } from "vitest";
import { NOT_FOUND_PATH, routeRequest, tableParam } from "./route";

const base = { rootDomain: "serbi.me", search: "" };

describe("routeRequest", () => {
  it("serves the root site on the root domain", () => {
    expect(routeRequest({ ...base, host: "serbi.me", pathname: "/" })).toEqual({ action: "next" });
  });

  it("rewrites a café host to its internal path, keeping path and query", () => {
    expect(routeRequest({ ...base, host: "lune.serbi.me", pathname: "/" })).toEqual({
      action: "rewrite",
      path: "/tenant/lune",
    });
    expect(
      routeRequest({ ...base, host: "lune.serbi.me", pathname: "/menu", search: "?t=08" }),
    ).toEqual({ action: "rewrite", path: "/tenant/lune/menu?t=08" });
  });

  it("never exposes the internal /tenant paths directly", () => {
    for (const host of ["serbi.me", "lune.serbi.me", "preview.vercel.app"]) {
      expect(routeRequest({ ...base, host, pathname: "/tenant/other" })).toEqual({
        action: "rewrite",
        path: NOT_FOUND_PATH,
      });
    }
    expect(routeRequest({ ...base, host: "serbi.me", pathname: "/tenant" }).action).toBe("rewrite");
  });

  it("404s invalid café addresses", () => {
    expect(routeRequest({ ...base, host: "a.b.serbi.me", pathname: "/" })).toEqual({
      action: "rewrite",
      path: NOT_FOUND_PATH,
    });
  });

  it("previews: ?cafe= picks a café on other hosts only, and is remembered", () => {
    const preview = { ...base, host: "cafe-app-git-x.vercel.app", pathname: "/menu" };
    expect(routeRequest({ ...preview, previewParam: "lune" })).toEqual({
      action: "rewrite-and-remember",
      path: "/tenant/lune/menu",
      slug: "lune",
    });
    expect(routeRequest({ ...preview, previewCookie: "lune" })).toEqual({
      action: "rewrite",
      path: "/tenant/lune/menu",
    });
    // empty ?cafe= → back to the root site (cookie ignored)
    expect(routeRequest({ ...preview, previewParam: "", previewCookie: "lune" })).toEqual({
      action: "next",
    });
    // never on the real domain
    expect(
      routeRequest({ ...base, host: "serbi.me", pathname: "/", previewParam: "lune" }),
    ).toEqual({ action: "next" });
    // bad slug ignored
    expect(routeRequest({ ...preview, previewParam: "../x" })).toEqual({ action: "next" });
  });
});

describe("tableParam", () => {
  const q = (s: string) => new URLSearchParams(s);
  it("reads a scanned table code", () => {
    expect(tableParam(q("table=k7p2x9"))).toBe("K7P2X9");
    expect(tableParam(q("x=1"))).toBeNull();
  });
  it("forgets the table for empty or invalid codes", () => {
    expect(tableParam(q("table="))).toBe("");
    expect(tableParam(q("table=../../x"))).toBe("");
    expect(tableParam(q("table=O0IL11"))).toBe("");
  });
});
