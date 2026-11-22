import { z } from "zod";
import { optionsSchema, type OptionGroup } from "./schema";
import { BUILTIN_TAGS, tagName, type BuiltinTag } from "./tags";

/* Customer menu as returned by get_public_menu (visible categories, visible priced items). */

/** Translations of a record: { "en": { "name": "…", "description": "…" } } (bad shape → none). */
const i18n = z.record(z.string(), z.record(z.string(), z.string())).catch({});

export const publicMenuSchema = z.object({
  currency: z.string(),
  locale: z.string(),
  /** Languages the café offers, its main language first. */
  locales: z.array(z.string()).catch([]),
  /** The café's visible tags, in its order (built-ins: key set, name null = default translation). */
  tagList: z
    .array(
      z.object({
        id: z.string(),
        key: z.enum(BUILTIN_TAGS).nullable().catch(null),
        name: z.string().nullable(),
        icon: z.string(),
        i18n: i18n,
      }),
    )
    .catch([]),
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
          /** Ids of the item's visible tags (tagList). */
          tagIds: z.array(z.string()).catch([]),
          isAvailable: z.boolean(),
          isFeatured: z.boolean(),
          i18n: i18n.optional(),
          options: optionsSchema.default([]),
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
        options: translateOptions(item.options, lang),
      })),
    })),
  };
}

/** Option and choice names in the visitor's language (main text where not translated). */
function translateOptions(groups: OptionGroup[], lang: string): OptionGroup[] {
  const name = (tr: OptionGroup["i18n"], main: string) => tr[lang]?.name?.trim() || main;
  return groups.map((g) => ({
    ...g,
    name: name(g.i18n, g.name),
    choices: g.choices.map((c) => ({ ...c, name: name(c.i18n, c.name) })),
  }));
}

export type ShownTag = { id: string; name: string; icon: string };

/**
 * The café's tags in the visitor's language, by id: a translation, else the café's own name,
 * else (built-in, not renamed) the app's translation `builtin(key)`.
 */
export function tagsById(
  menu: PublicMenu,
  lang: string,
  builtin: (key: BuiltinTag) => string,
): Map<string, ShownTag> {
  return new Map(
    menu.tagList.map((t) => [t.id, { id: t.id, icon: t.icon, name: tagName(t, lang, builtin) }]),
  );
}
