import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiteHeader, SuspendedCafe } from "@/components/cafe/site";
import { OrderLive } from "@/components/order/order-live";
import { Icon } from "@/components/ui/icon";
import { applyCafeLocale } from "@/i18n/cafe-locale";
import { cafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { formatPrice } from "@/lib/menu/schema";
import type { OrderStatus } from "@/lib/orders/schema";

export const metadata: Metadata = { robots: { index: false } };

const STEPS = ["new", "accepted", "preparing", "ready", "served"] as const;

/** Customer's order (<slug>.<root>/order/<token>): live steps, lines and total. */
async function OrderPage({
  params,
}: {
  params: PageProps<"/tenant/[slug]/order/[token]">["params"];
}) {
  const { slug, token } = await params;
  await applyCafeLocale(slug);
  const t = await getTranslations("order.status");
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);
  if (cafe.status === "suspended") return <SuspendedCafe name={cafe.name} slug={slug} c={c} />;
  const order = await publicCafes.order(slug, token);
  if (!order) notFound();
  const closed = ["served", "declined", "cancelled"].includes(order.status);
  const stopped = order.status === "declined" || order.status === "cancelled";
  const reached = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="flex min-h-screen flex-col">
      <OrderLive slug={slug} token={token} closed={closed} />
      <SiteHeader name={cafe.name} slug={slug} c={c} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-md px-gutter py-md">
        <section className="flex flex-col gap-sm rounded-2xl bg-surface-container-lowest p-lg shadow-card-warm">
          <h1 className="text-headline-md font-bold" style={{ color: c.primary }}>
            {t("title", { number: order.number })}
          </h1>
          <p
            className="text-body-lg font-semibold text-on-surface"
            role="status"
            aria-live="polite"
          >
            {t(`headline.${order.status}`)}
          </p>
          {order.status === "ready" ? (
            <p className="text-on-surface-variant">
              {order.kind === "table"
                ? t("readyTable", { label: order.tableLabel ?? "" })
                : t("readyTakeaway", { name: order.customerName })}
            </p>
          ) : null}
          {stopped && order.declineReason ? (
            <p
              className="rounded-xl bg-error-container p-sm text-body-sm text-on-error-container"
              dir="auto"
            >
              {t("reason", { reason: order.declineReason })}
            </p>
          ) : null}
          {!stopped ? (
            <ol
              className="mt-sm flex items-center gap-xs"
              aria-label={t("title", { number: order.number })}
            >
              {STEPS.map((s: OrderStatus, i) => {
                const done = i <= reached;
                return (
                  <li key={s} className="flex flex-1 flex-col items-center gap-xs text-center">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-body-sm font-bold"
                      style={done ? { backgroundColor: c.primary, color: c.onPrimary } : undefined}
                      aria-current={i === reached ? "step" : undefined}
                    >
                      {done ? <Icon name="check" className="text-icon-md" /> : i + 1}
                    </span>
                    <span
                      className={`text-caption ${done ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}
                    >
                      {t(`steps.${s as (typeof STEPS)[number]}`)}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {!closed ? (
            <p className="flex items-center gap-xs text-caption text-on-surface-variant">
              <Icon name="sync" className="text-icon-sm" /> {t("live")}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-surface-container-lowest p-lg shadow-sm">
          <ul className="flex flex-col divide-y divide-surface-container-high">
            {order.items.map((li, i) => (
              <li key={i} className="flex justify-between gap-sm py-sm">
                <span className="min-w-0">
                  <span className="block font-semibold" dir="auto">
                    {li.quantity} × {li.name}
                  </span>
                  {li.options.length ? (
                    <span className="block text-caption text-on-surface-variant" dir="auto">
                      {li.options.map((o) => o.choice).join(", ")}
                    </span>
                  ) : null}
                  {li.note ? (
                    <span className="block text-caption text-on-surface-variant italic" dir="auto">
                      “{li.note}”
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums" dir="ltr">
                  {formatPrice(li.lineTotal, order.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-sm flex items-center justify-between border-t border-surface-container-high pt-sm font-bold">
            <span>{(await getTranslations("order"))("total")}</span>
            <span className="tabular-nums" dir="ltr">
              {formatPrice(order.subtotal, order.currency)}
            </span>
          </div>
          <p className="mt-xs text-caption text-on-surface-variant">
            {order.isPaid ? t("paid") : (await getTranslations("order"))("payAtCounter")}
          </p>
        </section>

        <Link
          href="/menu"
          className="flex items-center justify-center gap-xs rounded-full border border-surface-container-high p-sm font-semibold"
          style={{ color: c.primary }}
        >
          <Icon name="restaurant_menu" className="text-icon-lg" />
          {closed ? t("backToMenu") : t("orderMore")}
        </Link>
      </main>
    </div>
  );
}

export default function Page({ params }: PageProps<"/tenant/[slug]/order/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <OrderPage params={params} />
    </Suspense>
  );
}
