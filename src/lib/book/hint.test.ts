import { describe, expect, it } from "vitest";
import { HINT_KEY, hintSeen, markHintSeen } from "./hint";

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe("book hint (once per device)", () => {
  it("is shown until marked as seen", () => {
    const s = memory();
    expect(hintSeen(s)).toBe(false);
    markHintSeen(s);
    expect(hintSeen(s)).toBe(true);
    expect(s.getItem(HINT_KEY)).toBe("1");
  });
  it("blocked storage: shown again, never crashes", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(hintSeen(blocked)).toBe(false);
    expect(() => markHintSeen(blocked)).not.toThrow();
    expect(hintSeen(null)).toBe(false);
  });
});
