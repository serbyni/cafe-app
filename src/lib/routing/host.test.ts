import { describe, expect, it } from "vitest";
import { isCafeSlug, parseHost } from "./host";

describe("parseHost", () => {
  it.each([
    // production root
    ["serbi.me", "serbi.me", { kind: "root" }],
    ["www.serbi.me", "serbi.me", { kind: "root" }],
    ["SERBI.ME.", "serbi.me", { kind: "root" }],
    ["lune-bleue.serbi.me", "serbi.me", { kind: "cafe", slug: "lune-bleue" }],
    ["Lune-Bleue.Serbi.Me:443", "serbi.me", { kind: "cafe", slug: "lune-bleue" }],
    // dev root (cafés one level below dev.serbi.me)
    ["dev.serbi.me", "dev.serbi.me", { kind: "root" }],
    ["lune.dev.serbi.me", "dev.serbi.me", { kind: "cafe", slug: "lune" }],
    ["lune.dev.serbi.me", "serbi.me", { kind: "invalid" }], // nested on prod
    // local
    ["localhost:3001", "localhost:3001", { kind: "root" }],
    ["lune.localhost:3001", "localhost:3001", { kind: "cafe", slug: "lune" }],
    ["lune.localhost:3000", "localhost:3001", { kind: "other" }], // other port
    // invalid addresses → 404
    ["a.b.serbi.me", "serbi.me", { kind: "invalid" }],
    ["-lune.serbi.me", "serbi.me", { kind: "invalid" }],
    ["lune--bleue.serbi.me", "serbi.me", { kind: "invalid" }],
    ["x.serbi.me", "serbi.me", { kind: "invalid" }], // too short (min 3)
    // anything else
    ["cafe-app-git-x.vercel.app", "serbi.me", { kind: "other" }],
    ["evilserbi.me", "serbi.me", { kind: "other" }],
    ["127.0.0.1:3001", "localhost:3001", { kind: "other" }],
    ["", "serbi.me", { kind: "other" }],
  ])("%s (root %s)", (host, root, expected) => {
    expect(parseHost(host, root)).toEqual(expected);
  });

  it("slug rules match the database check", () => {
    expect(isCafeSlug("2-pigeons")).toBe(true);
    expect(isCafeSlug("a".repeat(30))).toBe(true);
    expect(isCafeSlug("a".repeat(31))).toBe(false);
    expect(isCafeSlug("lune_bleue")).toBe(false);
    expect(isCafeSlug("lune-")).toBe(false);
  });
});
