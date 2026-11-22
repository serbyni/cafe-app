import { describe, expect, it } from "vitest";
import { publicMenuSchema, tagsById } from "./public";

const raw = {
  currency: "TND",
  locale: "fr",
  locales: ["fr", "ar", "en"],
  tagList: [
    { id: "t1", key: "popular", name: null, icon: "local_fire_department", i18n: {} },
    { id: "t2", key: null, name: "Fait maison", icon: "home", i18n: { ar: { name: "منزلي" } } },
    { id: "t3", key: "something-new", name: "Bio", icon: "eco", i18n: {} },
  ],
  categories: [
    {
      id: "c",
      name: "Cafés",
      icon: "coffee",
      items: [
        {
          id: "i",
          name: "Latte",
          description: "",
          price: "6.5",
          image: null,
          tagIds: ["t2", "t1"],
          isAvailable: true,
          isFeatured: false,
        },
      ],
    },
  ],
};

describe("public menu tags", () => {
  it("parses tags (unknown built-in key → treated as custom) and item tag ids", () => {
    const m = publicMenuSchema.parse(raw);
    expect(m.tagList[2].key).toBeNull();
    expect(m.categories[0].items[0].tagIds).toEqual(["t2", "t1"]);
    expect(m.categories[0].icon).toBe("coffee");
  });

  it("names tags in the visitor's language", () => {
    const m = publicMenuSchema.parse(raw);
    const builtin = (k: string) => (k === "popular" ? "شائع" : k);
    const ar = tagsById(m, "ar", builtin);
    expect(ar.get("t1")?.name).toBe("شائع");
    expect(ar.get("t2")?.name).toBe("منزلي");
    expect(tagsById(m, "en", builtin).get("t2")?.name).toBe("Fait maison");
  });

  it("an older reply without tagList still parses (no tags)", () => {
    const old: Partial<typeof raw> = { ...raw };
    delete old.tagList;
    expect(publicMenuSchema.parse(old).tagList).toEqual([]);
  });
});
