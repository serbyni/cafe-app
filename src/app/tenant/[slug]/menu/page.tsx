import { BookView } from "@/components/book/book-view";
import type { BookLabels } from "@/components/book/menu-book";
import { isRtl } from "@/i18n/config";
import type { BookInput } from "@/lib/book/paginate";
import { tagsById } from "@/lib/menu/public";
import { formatPrice } from "@/lib/menu/schema";
import { mediaUrl } from "@/lib/media/config";
import { groupHours } from "@/lib/website/schema";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiteFooter, SiteHeader, SuspendedCafe } from "@/components/cafe/site";
import { MenuView } from "@/components/menu/menu-view";
import { CartBar } from "@/components/order/cart-bar";
import { CartProvider } from "@/components/order/cart-context";
import { TrackOrder } from "@/components/order/track-order";
import { SwitchTableButton } from "@/components/order/switch-table-button";
import { Icon } from "@/components/ui/icon";
import { applyCafeLocale } from "@/i18n/cafe-locale";
import { cafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { translateMenu } from "@/lib/menu/public";
import { TABLE_COOKIE, TABLE_PICK_COOKIE } from "@/lib/routing/route";

export async function generateMetadata({
  params,
}: PageProps<"/tenant/[slug]/menu">): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await publicCafes.get(slug);
  await applyCafeLocale(slug);
  const t = await getTranslations();
  return {
    title: cafe ? { absolute: t("menu.title", { name: cafe.name }) } : t("notFound.metaTitle"),
  };
}

/** Café menu (<slug>.<root>/menu): the owner's menu, or "coming soon" while nothing is priced. */
async function CafeMenu({
  params,
  searchParams,
}: {
  params: PageProps<"/tenant/[slug]/menu">["params"];
  searchParams: PageProps<"/tenant/[slug]/menu">["searchParams"];
}) {
  const { slug } = await params;
  const { view } = await searchParams;
  const lang = await applyCafeLocale(slug);
  const t = await getTranslations("menu");
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);
  if (cafe.status === "suspended") return <SuspendedCafe name={cafe.name} slug={slug} c={c} />;
  // Table remembered from a QR scan (set by the proxy from ?table=<code>).
  const jar = await cookies();
  const picked = jar.get(TABLE_PICK_COOKIE)?.value;
  // A table picked from the list wins over the scanned one.
  const table =
    (picked && (await publicCafes.tables(slug)).find((t) => t.id === picked)?.label) ||
    (await publicCafes.tableLabel(slug, jar.get(TABLE_COOKIE)?.value));
  const raw = await publicCafes.menu(slug);
  const menu = raw ? translateMenu(raw, lang) : null;
  const hasMenu = !!menu && menu.categories.length > 0;
  // Ordering: owner's switch + opening hours (never cached).
  const ordering = hasMenu ? await publicCafes.ordering(slug) : null;
  const canOrder = !!ordering?.acceptingOrders && ordering.openNow;
  const to = await getTranslations("order");
  const days = to("weekdays").split("|");
  const menuOnly = !!menu?.menuOnly;
  const book = hasMenu && menu.display === "book" && view !== "list" ? await bookData() : null;

  /** Everything the 3D book needs, in the visitor's language (drawn in the browser). */
  async function bookData() {
    if (!menu || cafe?.status !== "active") return null;
    const [tb, ts, tt] = await Promise.all([
      getTranslations("book"),
      getTranslations("site"),
      getTranslations("tags"),
    ]);
    const tags = tagsById(menu, lang, (k) => tt(k));
    const input: BookInput = {
      title: cafe.name,
      subtitle: tb("subtitle"),
      contentsTitle: tb("contents"),
      backTitle: ts("openingHours"),
      hours: cafe.openingHours
        ? groupHours(cafe.openingHours, { days: ts.raw("days") as string[], closed: ts("closed") })
        : [],
      lines: [
        [cafe.address, cafe.city].filter(Boolean).join(", "),
        cafe.phone ?? "",
        cafe.email ?? "",
      ].filter(Boolean),
      categories: menu.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        items: cat.items.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          price: formatPrice(it.price, menu.currency),
          tags: it.tagIds
            .map((id) => tags.get(id))
            .filter((x) => !!x)
            .map((x) => ({ name: x!.name, icon: x!.icon })),
          image: it.image ? mediaUrl(it.image.path) : null,
        })),
      })),
    };
    const labels: BookLabels = {
      continued: tb("continued"),
      cover: tb("cover"),
      backCover: tb("backCover"),
      pages: tb("pages"),
      prev: tb("prev"),
      next: tb("next"),
      contents: tb("contents"),
      zoomIn: tb("zoomIn"),
      zoomOut: tb("zoomOut"),
      fullscreen: tb("fullscreen"),
      exitFullscreen: tb("exitFullscreen"),
      listView: tb("listView"),
      bookLabel: tb("bookLabel", { name: cafe.name }),
      noWebgl: tb("noWebgl"),
      gotIt: tb("gotIt"),
      hintTap: tb("hintTap"),
      hintSwipe: tb("hintSwipe"),
      hintZoom: tb("hintZoom"),
    };
    return { input, labels, bookView: tb("bookView") };
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={cafe.name} slug={slug} c={c} showMenuButton={false} />
      <main
        className={`mx-auto flex w-full max-w-3xl flex-1 flex-col gap-md px-gutter ${hasMenu ? "py-md" : "justify-center py-xl"}`}
      >
        {table && !menuOnly ? (
          <section
            aria-label={t("yourTable")}
            className="flex items-center gap-md rounded-2xl p-md shadow-sm"
            style={{ backgroundColor: c.container, color: c.onContainer }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: c.primary, color: c.onPrimary }}
            >
              <Icon name="table_restaurant" className="text-icon-xl" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption uppercase">{t("youreAt")}</p>
              <p className="truncate text-headline-md font-bold">{t("table", { label: table })}</p>
            </div>
            <SwitchTableButton slug={slug} tableLabel={table} c={c} />
          </section>
        ) : null}
        {menuOnly ? null : <TrackOrder slug={slug} c={c} />}
        {ordering?.acceptingOrders && !ordering.openNow ? (
          <p
            role="status"
            className="flex items-center gap-sm rounded-2xl bg-surface-container p-md text-body-sm text-on-surface"
          >
            <Icon name="schedule" className="text-icon-lg" />
            {ordering.opensAt !== undefined && ordering.opensDay !== undefined
              ? to("closedOpens", { day: days[ordering.opensDay], time: ordering.opensAt })
              : to("closedNow")}
          </p>
        ) : null}
        {book ? (
          <>
            <BookView
              input={book.input}
              c={c}
              rtl={isRtl(lang)}
              labels={book.labels}
              listHref="/menu?view=list"
            />
            {/* For screen readers: the whole menu as text. */}
            <section className="sr-only" aria-label={t("title", { name: cafe.name })}>
              {book.input.categories.map((cat) => (
                <div key={cat.id}>
                  <h2>{cat.name}</h2>
                  <ul>
                    {cat.items.map((it) => (
                      <li key={it.id}>
                        {it.name} — {it.price}
                        {it.description ? `. ${it.description}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </>
        ) : hasMenu ? (
          <CartProvider slug={slug}>
            {menu.display === "book" ? (
              <Link
                href="/menu"
                className="flex w-fit items-center gap-xs self-end rounded-full bg-surface-container-lowest px-md py-xs text-body-sm font-semibold shadow-sm"
                style={{ color: c.primary }}
              >
                <Icon name="menu_book" className="text-icon-lg" />
                {(await getTranslations("book"))("bookView")}
              </Link>
            ) : null}
            <MenuView menu={menu} c={c} canOrder={canOrder} />
            {canOrder ? (
              <CartBar
                key={table ?? "takeaway"}
                slug={slug}
                currency={menu.currency}
                c={c}
                tableLabel={table}
              />
            ) : null}
            {/* Room for the sticky "View order" bar. */}
            {canOrder ? <div className="h-20" aria-hidden="true" /> : null}
          </CartProvider>
        ) : (
          <section className="rounded-2xl bg-surface-container-lowest p-lg text-center shadow-card-warm">
            <span
              className="mx-auto mb-sm flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: c.container, color: c.onContainer }}
            >
              <Icon name="restaurant_menu" className="text-icon-xl" />
            </span>
            <h1 className="text-headline-md text-on-surface">{t("comingSoonTitle")}</h1>
            <p className="mt-xs text-body-sm text-on-surface-variant">{t("comingSoonBody")}</p>
          </section>
        )}
      </main>
      <SiteFooter cafe={cafe} hours={cafe.openingHours} c={c} />
    </div>
  );
}

export default function CafeMenuPage({ params, searchParams }: PageProps<"/tenant/[slug]/menu">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CafeMenu params={params} searchParams={searchParams} />
    </Suspense>
  );
}
