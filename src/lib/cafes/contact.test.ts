import { describe, expect, it } from "vitest";
import { formatPhone, mapUrl, socialHandle } from "./contact";

describe("café contact display", () => {
  it("formats phone numbers internationally", () => {
    expect(formatPhone("+21671123456")).toBe("+216 71 123 456");
    expect(formatPhone("not-a-number")).toBe("not-a-number");
  });
  it("shows social handles", () => {
    expect(socialHandle("https://www.instagram.com/lune.bleue")).toBe("@lune.bleue");
    expect(socialHandle("https://www.facebook.com/lunebleue")).toBe("lunebleue");
  });
  it("builds a map link", () => {
    expect(mapUrl(36.8, 10.18)).toContain("mlat=36.8&mlon=10.18");
  });
});
