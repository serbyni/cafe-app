import { describe, expect, it } from "vitest";
import { contentsEntryAt, paginate, wrap, type BookCategory, type Measure } from "./paginate";

// Every character is 20 px wide, whatever the font.
const measure: Measure = (t) => t.length * 20;

const item = (id: string, desc = "") => ({
  id,
  name: `Item ${id}`,
  description: desc,
  price: "6.500 TND",
  tags: [],
  image: null,
});
const cat = (id: string, n: number, desc = ""): BookCategory => ({
  id,
  name: `Cat ${id}`,
  icon: null,
  items: Array.from({ length: n }, (_, i) => item(`${id}${i}`, desc)),
});
const input = (categories: BookCategory[]) => ({
  title: "Café",
  subtitle: "Menu",
  contentsTitle: "Contents",
  backTitle: "Hours",
  hours: [{ days: "Mon – Sun", hours: "08:00 – 20:00" }],
  lines: ["Tunis"],
  categories,
});

describe("book pagination", () => {
  it("cover · contents · categories · back, even page count", () => {
    const kinds = paginate(input([cat("a", 2), cat("b", 1)]), measure).map((p) => p.kind);
    // 4 pages + back = 5 → a blank page keeps the count even.
    expect(kinds).toEqual(["cover", "contents", "category", "category", "blank", "back"]);
    const one = paginate(input([cat("a", 1)]), measure).map((p) => p.kind);
    expect(one).toEqual(["cover", "contents", "category", "back"]);
  });

  it("long categories continue on the next page and contents point to their first page", () => {
    const long = "word ".repeat(80);
    const pages = paginate(input([cat("a", 12, long), cat("b", 1)]), measure);
    const cats = pages.filter((p) => p.kind === "category");
    expect(cats.length).toBeGreaterThan(2);
    expect(cats[0]).toMatchObject({ title: "Cat a", continued: false, number: 2 });
    expect(cats[1]).toMatchObject({ title: "Cat a", continued: true, number: 3 });
    const contents = pages[1];
    if (contents.kind !== "contents") throw new Error("contents expected");
    const b = cats.find((p) => p.kind === "category" && p.title === "Cat b")!;
    expect(contents.entries.map((e) => e.page)).toEqual([2, b.kind === "category" ? b.number : -1]);
    // Every block fits on its page.
    for (const p of cats)
      if (p.kind === "category")
        for (const bl of p.blocks) expect(bl.y + bl.height).toBeLessThanOrEqual(1448);
  });

  it("empty categories are skipped; a tap on a contents line gives its page", () => {
    const pages = paginate(input([cat("a", 0), cat("b", 1)]), measure);
    const contents = pages[1];
    expect(contents.kind === "contents" && contents.entries.map((e) => e.name)).toEqual(["Cat b"]);
    if (contents.kind === "contents")
      expect(contentsEntryAt(contents, contents.entries[0].y - 10)).toBe(2);
    expect(contentsEntryAt(pages[0], 300)).toBeNull();
  });

  it("wraps words and cuts the last line with an ellipsis", () => {
    expect(wrap("aaa bbb ccc", "itemDesc", 140, 3, measure)).toEqual(["aaa bbb", "ccc"]);
    const cut = wrap("aaaa bbbb cccc dddd", "itemDesc", 100, 2, measure);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith("…")).toBe(true);
  });
});
