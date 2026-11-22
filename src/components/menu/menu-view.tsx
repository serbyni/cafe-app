"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import { mediaUrl } from "@/lib/media/config";
import { tagsById, type PublicMenu, type PublicMenuItem, type ShownTag } from "@/lib/menu/public";
import { formatPrice } from "@/lib/menu/schema";
import { useCart } from "@/components/order/cart-context";
import { ItemOrder } from "@/components/order/item-order";

/*
 * Customer menu (phone-first): search, sticky category chips that follow the scroll, item cards
 * and an item sheet. Café colours are runtime values → inline styles. Ordering ("+") comes with
 * the ordering module; the card layout leaves room for it.
 */

function Photo({ item, className }: { item: PublicMenuItem; className: string }) {
  if (!item.image) {
    return (
      <span
        className={`flex items-center justify-center bg-surface-container text-outline ${className}`}
      >
        <Icon name="restaurant" className="text-icon-xl" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- resized on upload, public media bucket
    <img
      src={mediaUrl(item.image.path)}
      alt={item.image.alt || item.name}
      loading="lazy"
      decoding="async"
      className={`object-cover ${item.isAvailable ? "" : "grayscale"} ${className}`}
    />
  );
}

export function MenuView({
  menu,
  c,
  canOrder = false,
}: {
  menu: PublicMenu;
  c: CafePalette;
  /** The café takes orders now (cart buttons shown). */
  canOrder?: boolean;
}) {
  const t = useTranslations("menu");
  const to = useTranslations("order");
  const cart = useCart();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const quickAdd = (item: PublicMenuItem) => {
    if (!cart) return;
    if (item.options.length) {
      setOpen(item);
      return;
    }
    cart.add({
      itemId: item.id,
      name: item.name,
      choices: [],
      choiceNames: [],
      unitPrice: item.price,
      quantity: 1,
      note: "",
    });
    setJustAdded(item.id);
    setTimeout(() => setJustAdded((id) => (id === item.id ? null : id)), 1500);
  };
  const tt = useTranslations("tags");
  const locale = useLocale();
  // The café's tags in the visitor's language (built-ins: the app's translation).
  const tagMap = useMemo(() => tagsById(menu, locale, (k) => tt(k)), [menu, locale, tt]);
  const tagsOf = (item: PublicMenuItem): ShownTag[] =>
    item.tagIds.map((id) => tagMap.get(id)).filter((x): x is ShownTag => !!x);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(menu.categories[0]?.id ?? "");
  const [open, setOpen] = useState<PublicMenuItem | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  /** Until when a tapped chip wins over the scroll spy (while the page scrolls to it). */
  const pinnedUntil = useRef(0);

  const q = query.trim().toLowerCase();
  const categories = useMemo(
    () =>
      menu.categories
        .map((cat) => ({
          ...cat,
          items: q
            ? cat.items.filter(
                (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
              )
            : cat.items,
        }))
        .filter((cat) => cat.items.length > 0),
    [menu.categories, q],
  );

  // Scroll spy: the chip of the section being read is highlighted (and kept in view).
  useEffect(() => {
    const sections = categories
      .map((cat) => document.getElementById(`cat-${cat.id}`))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (Date.now() < pinnedUntil.current) return;
        if (visible[0]) setActive(visible[0].target.id.slice(4));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    // At the very bottom the last (often short) section can't reach the top zone: it wins there.
    const onScroll = () => {
      if (Date.now() < pinnedUntil.current) return;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) setActive(sections[sections.length - 1].id.slice(4));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [categories]);
  useEffect(() => {
    chipsRef.current
      ?.querySelector<HTMLElement>(`[data-cat="${active}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const chip = (on: boolean): CSSProperties =>
    on ? { backgroundColor: c.primary, color: c.onPrimary } : {};

  return (
    <div className="flex flex-col gap-md">
      <label className="flex items-center gap-sm rounded-2xl bg-surface-container-low px-md py-sm">
        <Icon name="search" className="text-icon-lg text-on-surface-variant" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="min-w-0 flex-1 bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
        />
      </label>

      {/* Sticky category chips (below the site header) */}
      <nav
        aria-label={t("categories")}
        className="sticky top-14 z-30 -mx-gutter bg-background/95 px-gutter py-xs backdrop-blur"
      >
        <div ref={chipsRef} className="no-scrollbar flex gap-xs overflow-x-auto">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              data-cat={cat.id}
              aria-current={active === cat.id ? "true" : undefined}
              onClick={() => {
                pinnedUntil.current = Date.now() + 1200;
                setActive(cat.id);
              }}
              className={`inline-flex shrink-0 items-center gap-xs rounded-full px-md py-xs text-body-sm font-semibold whitespace-nowrap ${
                active === cat.id ? "shadow-sm" : "bg-surface-container text-on-surface-variant"
              }`}
              style={chip(active === cat.id)}
            >
              {cat.icon ? <Icon name={cat.icon} className="text-icon-md" /> : null}
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      {categories.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-lowest p-lg text-center text-on-surface-variant">
          {t("noMatch", { query })}
        </p>
      ) : (
        categories.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            aria-labelledby={`h-${cat.id}`}
            className="scroll-mt-32"
          >
            <h2
              id={`h-${cat.id}`}
              dir="auto"
              className="mb-sm flex items-center gap-sm text-headline-md"
              style={{ color: c.primary }}
            >
              {cat.icon ? <Icon name={cat.icon} className="text-icon-xl" /> : null}
              {cat.name}
            </h2>
            <ul className="flex flex-col gap-sm">
              {cat.items.map((item) => (
                <li key={item.id} className="relative">
                  {canOrder && cart && item.isAvailable ? (
                    <button
                      type="button"
                      onClick={() => quickAdd(item)}
                      aria-label={to("addName", { name: item.name })}
                      className="absolute end-sm bottom-sm z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
                      style={{ backgroundColor: c.primary, color: c.onPrimary }}
                    >
                      <Icon
                        name={justAdded === item.id ? "check" : "add"}
                        className="text-icon-lg"
                      />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpen(item)}
                    className={`flex w-full gap-md rounded-2xl bg-surface-container-lowest p-sm text-start shadow-sm transition-shadow hover:shadow-card-warm ${
                      item.isAvailable ? "" : "opacity-70"
                    }`}
                  >
                    <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                      <Photo item={item} className="absolute inset-0 h-full w-full" />
                      {!item.isAvailable ? (
                        <span className="absolute inset-x-0 bottom-0 bg-inverse-surface/85 py-0.5 text-center text-caption font-bold text-inverse-on-surface uppercase">
                          {t("soldOut")}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-xs py-xs">
                      <span className="flex items-start justify-between gap-sm">
                        <span dir="auto" className="font-semibold text-on-surface">
                          {item.name}
                        </span>
                        <span
                          className="shrink-0 font-bold tabular-nums"
                          style={{ color: c.primary }}
                          dir="ltr"
                        >
                          {formatPrice(item.price, menu.currency)}
                        </span>
                      </span>
                      {item.description ? (
                        <span
                          dir="auto"
                          className="line-clamp-2 text-body-sm text-on-surface-variant"
                        >
                          {item.description}
                        </span>
                      ) : null}
                      {tagsOf(item).length ? (
                        <span className="mt-auto flex flex-wrap gap-xs">
                          {tagsOf(item).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-xs rounded-full px-sm text-caption"
                              style={{ backgroundColor: c.container, color: c.onContainer }}
                            >
                              <Icon name={tag.icon} className="text-icon-sm" /> {tag.name}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ItemSheet
        item={open}
        currency={menu.currency}
        c={c}
        canOrder={canOrder}
        tags={open ? tagsOf(open) : []}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

/** Item details as a bottom sheet (native <dialog>: focus trap, Esc closes). */
function ItemSheet({
  item,
  currency,
  c,
  canOrder,
  tags,
  onClose,
}: {
  item: PublicMenuItem | null;
  currency: string;
  c: CafePalette;
  canOrder: boolean;
  /** The item's tags, already named in the visitor's language. */
  tags: ShownTag[];
  onClose: () => void;
}) {
  const t = useTranslations("menu");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);
  return (
    <dialog
      ref={ref}
      aria-label={item?.name}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-card-md overflow-hidden rounded-t-3xl bg-surface-container-lowest p-0 text-on-surface shadow-card-warm backdrop:bg-inverse-surface/50 sm:mb-auto sm:rounded-3xl"
    >
      {item ? (
        <div className="flex max-h-screen flex-col overflow-y-auto">
          <div className="relative aspect-video w-full">
            <Photo item={item} className="absolute inset-0 h-full w-full" />
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="absolute end-sm top-sm flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface shadow-sm"
            >
              <Icon name="close" className="text-icon-lg" />
            </button>
          </div>
          <div className="flex flex-col gap-sm p-lg">
            <div className="flex items-start justify-between gap-md">
              <h2 className="text-headline-md text-on-surface" dir="auto">
                {item.name}
              </h2>
              <p
                className="shrink-0 text-headline-md font-bold tabular-nums"
                style={{ color: c.primary }}
                dir="ltr"
              >
                {formatPrice(item.price, currency)}
              </p>
            </div>
            {!item.isAvailable ? (
              <p className="w-fit rounded-full bg-inverse-surface px-md py-xs text-body-sm font-semibold text-inverse-on-surface">
                {t("soldOutNow")}
              </p>
            ) : null}
            {item.description ? (
              <p dir="auto" className="text-body-md whitespace-pre-line text-on-surface-variant">
                {item.description}
              </p>
            ) : null}
            {tags.length ? (
              <ul className="flex flex-wrap gap-xs pt-xs">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="inline-flex items-center gap-xs rounded-full px-md py-xs text-body-sm"
                    style={{ backgroundColor: c.container, color: c.onContainer }}
                  >
                    <Icon name={tag.icon} className="text-icon-md" /> {tag.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {canOrder && item.isAvailable ? (
              <ItemOrder key={item.id} item={item} currency={currency} c={c} onAdded={onClose} />
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
