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
import { Icon } from "@/components/ui/icon";
import { applyCafeLocale } from "@/i18n/cafe-locale";
import { cafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { translateMenu } from "@/lib/menu/public";
import { TABLE_COOKIE } from "@/lib/routing/route";

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
async function CafeMenu({ params }: { params: PageProps<"/tenant/[slug]/menu">["params"] }) {
  const { slug } = await params;
  const lang = await applyCafeLocale(slug);
  const t = await getTranslations("menu");
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);
  if (cafe.status === "suspended") return <SuspendedCafe name={cafe.name} slug={slug} c={c} />;
  // Table remembered from a QR scan (set by the proxy from ?table=<code>).
  const table = await publicCafes.tableLabel(slug, (await cookies()).get(TABLE_COOKIE)?.value);
  const raw = await publicCafes.menu(slug);
  const menu = raw ? translateMenu(raw, lang) : null;
  const hasMenu = !!menu && menu.categories.length > 0;
  // Ordering: owner's switch + opening hours (never cached).
  const ordering = hasMenu ? await publicCafes.ordering(slug) : null;
  const canOrder = !!ordering?.acceptingOrders && ordering.openNow;
  const to = await getTranslations("order");
  const days = to("weekdays").split("|");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={cafe.name} slug={slug} c={c} showMenuButton={false} />
      <main
        className={`mx-auto flex w-full max-w-3xl flex-1 flex-col gap-md px-gutter ${hasMenu ? "py-md" : "justify-center py-xl"}`}
      >
        {table ? (
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
            {/* Full page load (not client navigation) so the cleared table isn't served from the
                router's cache. */}
            <form action="/menu" className="shrink-0">
              <input type="hidden" name="table" value="" />
              <button type="submit" className="text-body-sm underline underline-offset-2">
                {t("notYourTable")}
              </button>
            </form>
          </section>
        ) : null}
        <TrackOrder slug={slug} c={c} />
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
        {hasMenu ? (
          <CartProvider slug={slug}>
            <MenuView menu={menu} c={c} canOrder={canOrder} />
            {canOrder ? (
              <CartBar slug={slug} currency={menu.currency} c={c} tableLabel={table} />
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
      <SiteFooter cafe={cafe} hours={cafe.website?.footer.hours ?? null} c={c} />
    </div>
  );
}

export default function CafeMenuPage({ params }: PageProps<"/tenant/[slug]/menu">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CafeMenu params={params} />
    </Suspense>
  );
}
