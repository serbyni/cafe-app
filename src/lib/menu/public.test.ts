import { describe, expect, it } from "vitest";
import { publicMenuSchema, translateMenu } from "./public";

const menu = publicMenuSchema.parse({
  currency: "EUR",
  locale: "fr",
  locales: ["fr", "en", "it"],
  categories: [
    {
      id: "c1",
      name: "Café",
      i18n: { en: { name: "Coffee" } },
      items: [
        {
          id: "i1",
          name: "Café crème",
          description: "Espresso et lait chaud.",
          price: "3.2",
          image: null,
          tags: [],
          isAvailable: true,
          isFeatured: true,
          i18n: { en: { name: "White coffee", description: "" } },
        },
        {
          id: "i2",
          name: "Thé à la menthe",
          description: "",
          price: 2.5,
          image: null,
          tags: [],
          isAvailable: true,
          isFeatured: false,
          i18n: "bad shape",
        },
      ],
    },
  ],
});

describe("translateMenu", () => {
  it("uses the translations, the main text where one is missing", () => {
    const en = translateMenu(menu, "en");
    expect(en.categories[0].name).toBe("Coffee");
    expect(en.categories[0].items[0].name).toBe("White coffee");
    expect(en.categories[0].items[0].description).toBe("Espresso et lait chaud.");
    expect(en.categories[0].items[1].name).toBe("Thé à la menthe");
  });

  it("keeps the menu as it is in the main language or an untranslated one", () => {
    expect(translateMenu(menu, "fr")).toBe(menu);
    expect(translateMenu(menu, "it").categories[0].items[0].name).toBe("Café crème");
  });
});
