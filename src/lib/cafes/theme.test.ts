import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_SEED } from "@/config/cafe-defaults";
import { cafePalette, themeSeed } from "./theme";

describe("café theme", () => {
  it("reads the stored seed and falls back to the default for anything else", () => {
    expect(themeSeed({ seed: "#24434b" })).toBe("#24434b");
    for (const bad of [
      null,
      undefined,
      {},
      { seed: "teal" },
      { seed: "#ABCDEF" },
      ["#24434b"],
      "x",
    ]) {
      expect(themeSeed(bad as never)).toBe(DEFAULT_BRAND_SEED);
    }
  });

  it("generates a full readable palette (hex colours, light surface, dark text)", () => {
    const p = cafePalette("#24434b");
    for (const v of Object.values(p)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    const lum = (h: string) =>
      parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(p.surface)).toBeGreaterThan(lum(p.onSurface));
    expect(lum(p.onPrimary)).toBeGreaterThan(lum(p.primary));
    expect(cafePalette("not-a-colour")).toEqual(cafePalette(DEFAULT_BRAND_SEED));
  });
});
