import { z } from "zod";
import { MENU_TAGS, type MenuTag } from "./schema";

/* Customer menu as returned by get_public_menu (visible categories, visible priced items). */

const TAG_VALUES = MENU_TAGS.map((t) => t.value) as [MenuTag, ...MenuTag[]];

/** Translations of a record: { "en": { "name": "…", "description": "…" } } (bad shape → none). */
const i18n = z.record(z.string(), z.record(z.string(), z.string())).catch({});

export const publicMenuSchema = z.object({
  currency: z.string(),
  locale: z.string(),
  /** Languages the café offers, its main language first. */
  locales: z.array(z.string()).catch([]),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      i18n: i18n.optional(),
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          price: z.coerce.number(),
          image: z
            .object({ path: z.string(), alt: z.string().catch("") })
            .nullable()
            .catch(null),
          // Unknown tags (newer app version) are dropped instead of failing the whole menu.
          tags: z
            .array(z.string())
            .transform((t) => t.filter((x): x is MenuTag => (TAG_VALUES as string[]).includes(x))),
          isAvailable: z.boolean(),
          isFeatured: z.boolean(),
          i18n: i18n.optional(),
        }),
      ),
    }),
  ),
});
export type PublicMenu = z.infer<typeof publicMenuSchema>;
export type PublicMenuItem = PublicMenu["categories"][number]["items"][number];

/** A translated text, or the main one when this language has none. */
const pick = (
  tr: Record<string, Record<string, string>> | undefined,
  lang: string,
  key: string,
  main: string,
) => tr?.[lang]?.[key]?.trim() || main;

/**
 * The menu in the visitor's language: names and descriptions translated by the owner, the main
 * text where a translation is missing (`lang` = the café's main language → unchanged).
 */
export function translateMenu(menu: PublicMenu, lang: string): PublicMenu {
  if (lang === menu.locale) return menu;
  return {
    ...menu,
    categories: menu.categories.map((cat) => ({
      ...cat,
      name: pick(cat.i18n, lang, "name", cat.name),
      items: cat.items.map((item) => ({
        ...item,
        name: pick(item.i18n, lang, "name", item.name),
        description: pick(item.i18n, lang, "description", item.description),
      })),
    })),
  };
}
