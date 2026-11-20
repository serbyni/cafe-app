import { z } from "zod";
import { MENU_TAGS, type MenuTag } from "./schema";

/* Customer menu as returned by get_public_menu (visible categories, visible priced items). */

const TAG_VALUES = MENU_TAGS.map((t) => t.value) as [MenuTag, ...MenuTag[]];

export const publicMenuSchema = z.object({
  currency: z.string(),
  locale: z.string(),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
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
        }),
      ),
    }),
  ),
});
export type PublicMenu = z.infer<typeof publicMenuSchema>;
export type PublicMenuItem = PublicMenu["categories"][number]["items"][number];
