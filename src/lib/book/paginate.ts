/*
 * 3D book menu — page layout (pure: text is measured by the caller's `measure`, so it can be
 * tested without a canvas). Pages are 1024 × 1448 (A5 ratio). Order: cover · contents (1+) ·
 * category pages · [blank] · back cover — always an even count (a book has sheets of 2 pages).
 */

export const PAGE_W = 1024;
export const PAGE_H = 1448;
export const MARGIN = 84;

/** Fonts used on the pages (CSS font shorthand without the family; the drawer adds it). */
export const FONTS = {
  coverTitle: "700 84px",
  coverSub: "500 40px",
  pageTitle: "700 56px",
  contentsLine: "500 38px",
  itemName: "700 36px",
  itemPrice: "700 36px",
  itemDesc: "400 26px",
  itemTags: "500 22px",
  small: "500 24px",
} as const;
export type FontKey = keyof typeof FONTS;

export const LINE = { itemName: 44, itemDesc: 34, itemTags: 34, contents: 68 } as const;
export const PHOTO = 168;
const GAP = 40;
const TITLE_H = 150;
const CONTINUED_TITLE_H = 110;
const FOOTER_H = 70;

export type BookItem = {
  id: string;
  name: string;
  description: string;
  /** Already formatted, e.g. "6.500 TND". */
  price: string;
  tags: { name: string; icon: string }[];
  image: string | null;
};
export type BookCategory = { id: string; name: string; icon: string | null; items: BookItem[] };

export type ItemBlock = {
  item: BookItem;
  /** Top of the block on the page (px). */
  y: number;
  height: number;
  nameLines: string[];
  descLines: string[];
};

export type PageSpec =
  | { kind: "cover"; title: string; subtitle: string }
  | {
      kind: "contents";
      title: string;
      entries: { name: string; icon: string | null; page: number; y: number }[];
    }
  | {
      kind: "category";
      title: string;
      icon: string | null;
      continued: boolean;
      blocks: ItemBlock[];
      number: number;
    }
  | { kind: "back"; title: string; hours: { days: string; hours: string }[]; lines: string[] }
  | { kind: "blank" };

export type Measure = (text: string, font: FontKey) => number;

/** Words → lines no wider than `max`; the last allowed line ends with "…" when cut. */
export function wrap(
  text: string,
  font: FontKey,
  max: number,
  maxLines: number,
  measure: Measure,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (measure(next, font) <= max || !cur) {
      cur = next;
      continue;
    }
    lines.push(cur);
    cur = words[i];
    if (lines.length === maxLines) {
      cur = "";
      // Cut: put an ellipsis on the last line.
      let last = lines[maxLines - 1];
      while (last && measure(`${last}…`, font) > max) last = last.slice(0, -1).trimEnd();
      lines[maxLines - 1] = `${last}…`;
      return lines;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Height and wrapped text of one item block. */
function itemBlock(item: BookItem, measure: Measure): Omit<ItemBlock, "y"> {
  const textW = PAGE_W - 2 * MARGIN - (item.image ? PHOTO + 28 : 0);
  const priceW = measure(item.price, "itemPrice") + 24;
  const nameLines = wrap(item.name, "itemName", textW - priceW, 2, measure);
  const descLines = item.description ? wrap(item.description, "itemDesc", textW, 4, measure) : [];
  const textH =
    nameLines.length * LINE.itemName +
    descLines.length * LINE.itemDesc +
    (item.tags.length ? LINE.itemTags + 6 : 0);
  return { item, height: Math.max(item.image ? PHOTO : 0, textH) + GAP, nameLines, descLines };
}

export type BookInput = {
  title: string;
  subtitle: string;
  contentsTitle: string;
  backTitle: string;
  hours: { days: string; hours: string }[];
  /** Address, phone, … one per line. */
  lines: string[];
  categories: BookCategory[];
};

/** All pages of the book. Contents entries point to the category's first page number. */
export function paginate(input: BookInput, measure: Measure): PageSpec[] {
  const categories = input.categories.filter((c) => c.items.length > 0);
  const perContents = Math.floor((PAGE_H - 2 * MARGIN - TITLE_H - FOOTER_H) / LINE.contents);
  const contentsPages = Math.max(1, Math.ceil(categories.length / perContents));

  // Category pages (page numbers start after the cover and the contents pages).
  const body: Extract<PageSpec, { kind: "category" }>[] = [];
  const firstPage = new Map<string, number>();
  const bottom = PAGE_H - MARGIN - FOOTER_H;
  for (const cat of categories) {
    let page: Extract<PageSpec, { kind: "category" }> | null = null;
    let y = 0;
    for (const item of cat.items) {
      const b = itemBlock(item, measure);
      if (!page || y + b.height > bottom) {
        const continued: boolean = page !== null;
        page = {
          kind: "category",
          title: cat.name,
          icon: cat.icon,
          continued,
          blocks: [],
          number: 0,
        };
        body.push(page);
        if (!continued) firstPage.set(cat.id, 1 + contentsPages + body.length - 1);
        y = MARGIN + (continued ? CONTINUED_TITLE_H : TITLE_H);
      }
      page.blocks.push({ ...b, y });
      y += b.height;
    }
  }
  body.forEach((p, i) => (p.number = 1 + contentsPages + i));

  const contents: PageSpec[] = [];
  for (let i = 0; i < contentsPages; i++) {
    const slice = categories.slice(i * perContents, (i + 1) * perContents);
    contents.push({
      kind: "contents",
      title: input.contentsTitle,
      entries: slice.map((c, j) => ({
        name: c.name,
        icon: c.icon,
        page: firstPage.get(c.id) ?? 0,
        y: MARGIN + TITLE_H + j * LINE.contents,
      })),
    });
  }

  const pages: PageSpec[] = [
    { kind: "cover", title: input.title, subtitle: input.subtitle },
    ...contents,
    ...body,
  ];
  // Even count: the back cover is the back of the last sheet.
  if ((pages.length + 1) % 2 !== 0) pages.push({ kind: "blank" });
  pages.push({ kind: "back", title: input.backTitle, hours: input.hours, lines: input.lines });
  return pages;
}

/** Contents entry at a point of a contents page (page coordinates), if any. */
export function contentsEntryAt(page: PageSpec, y: number): number | null {
  if (page.kind !== "contents") return null;
  const e = page.entries.find(
    (x) => y >= x.y - LINE.contents * 0.7 && y < x.y + LINE.contents * 0.3,
  );
  return e ? e.page : null;
}
