"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { placeOrderAction, type PlaceOrderResult } from "@/app/tenant/[slug]/actions";
import { Icon } from "@/components/ui/icon";
import { cartCount, cartTotal, rememberOrder } from "@/lib/cart/cart";
import type { CafePalette } from "@/lib/cafes/theme";
import { formatPrice } from "@/lib/menu/schema";
import { useCart } from "./cart-context";

/** Sticky "View order" bar + the order sheet (lines, note, table or takeaway name, send). */
export function CartBar({
  slug,
  currency,
  c,
  tableLabel,
}: {
  slug: string;
  currency: string;
  c: CafePalette;
  tableLabel: string | null;
}) {
  const t = useTranslations("order");
  const cart = useCart();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<{ text: string; itemId?: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  if (!cart) return null;
  const count = cartCount(cart.cart);
  const total = formatPrice(cartTotal(cart.cart), currency);

  const errorText = (r: Extract<PlaceOrderResult, { ok: false }>) => {
    if (r.error === "unavailable") {
      const line = cart.cart.lines.find((l) => l.itemId === r.itemId);
      return line ? t("errors.unavailable", { name: line.name }) : t("errors.unavailableSome");
    }
    return t(`errors.${r.error}`);
  };

  const send = () =>
    start(async () => {
      setError(null);
      const r = await placeOrderAction(slug, {
        customerName: tableLabel ? "" : name,
        customerEmail: email.trim(),
        note,
        website,
        items: cart.cart.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          choices: l.choices,
          note: l.note,
        })),
      });
      if (!r.ok) {
        setError({ text: errorText(r), itemId: r.error === "unavailable" ? r.itemId : undefined });
        return;
      }
      rememberOrder(slug, { token: r.token, number: r.number });
      cart.clear();
      setOpen(false);
      router.push(`/order/${r.token}`);
    });

  return (
    <>
      {count > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-gutter pb-md">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 w-full max-w-3xl items-center justify-center gap-sm rounded-full font-bold shadow-card-warm"
            style={{ backgroundColor: c.primary, color: c.onPrimary }}
          >
            <Icon name="shopping_bag" className="text-icon-lg" />
            {t("viewOrder", { count, total })}
          </button>
        </div>
      ) : null}
      <dialog
        ref={ref}
        aria-label={t("yourOrder")}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="mx-auto mt-auto mb-0 w-full max-w-card-md overflow-hidden rounded-t-3xl bg-surface-container-lowest p-0 text-on-surface shadow-card-warm backdrop:bg-inverse-surface/50 sm:mb-auto sm:rounded-3xl"
      >
        <div className="flex max-h-screen flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-sm p-lg pb-sm">
            <h2 className="text-headline-md">{t("yourOrder")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container"
            >
              <Icon name="close" className="text-icon-lg" />
            </button>
          </div>
          <div className="flex flex-col gap-md px-lg pb-lg">
            {cart.cart.lines.length === 0 ? (
              <p className="text-on-surface-variant">{t("emptyCart")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-surface-container-high">
                {cart.cart.lines.map((l) => (
                  <li
                    key={l.key}
                    className={`flex items-start justify-between gap-sm py-sm ${error?.itemId === l.itemId ? "rounded-lg bg-error-container px-xs" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold" dir="auto">
                        {l.name}
                      </span>
                      {l.choiceNames.length ? (
                        <span className="block text-caption text-on-surface-variant" dir="auto">
                          {l.choiceNames.join(", ")}
                        </span>
                      ) : null}
                      {l.note ? (
                        <span
                          className="block text-caption text-on-surface-variant italic"
                          dir="auto"
                        >
                          “{l.note}”
                        </span>
                      ) : null}
                      <span className="block text-body-sm tabular-nums" dir="ltr">
                        {formatPrice(l.unitPrice * l.quantity, currency)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center rounded-full border border-surface-container-high">
                      <button
                        type="button"
                        aria-label={l.quantity === 1 ? t("remove", { name: l.name }) : t("less")}
                        onClick={() => cart.setQty(l.key, l.quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center"
                      >
                        <Icon
                          name={l.quantity === 1 ? "delete" : "remove"}
                          className="text-icon-md"
                        />
                      </button>
                      <span className="w-5 text-center font-bold tabular-nums">{l.quantity}</span>
                      <button
                        type="button"
                        aria-label={t("more")}
                        disabled={l.quantity >= 20}
                        onClick={() => cart.setQty(l.key, l.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
                      >
                        <Icon name="add" className="text-icon-md" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <label className="flex flex-col gap-xs text-body-sm text-on-surface-variant">
              {t("orderNote")}
              <textarea
                rows={2}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl border border-surface-container-high bg-transparent px-md py-sm text-body-md text-on-surface focus:outline-none"
                dir="auto"
              />
            </label>
            {tableLabel ? (
              <p
                className="flex items-center gap-sm rounded-xl p-sm font-semibold"
                style={{ backgroundColor: c.container, color: c.onContainer }}
              >
                <Icon name="table_restaurant" className="text-icon-lg" />
                {t("forTable", { label: tableLabel })}
              </p>
            ) : (
              <div className="flex flex-col gap-xs">
                <p className="flex items-center gap-xs text-body-sm font-semibold">
                  <Icon name="takeout_dining" className="text-icon-md" /> {t("takeaway")}
                </p>
                <label className="flex flex-col gap-xs text-body-sm text-on-surface-variant">
                  {t("yourName")}
                  <input
                    id="customer-name"
                    value={name}
                    maxLength={40}
                    autoComplete="given-name"
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border border-surface-container-high bg-transparent px-md py-sm text-body-md text-on-surface focus:outline-none"
                    dir="auto"
                  />
                  <span className="text-caption">{t("yourNameHint")}</span>
                </label>
              </div>
            )}
            <label className="flex flex-col gap-xs text-body-sm text-on-surface-variant">
              {t("email")}
              <input
                id="customer-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-surface-container-high bg-transparent px-md py-sm text-body-md text-on-surface focus:outline-none"
                dir="ltr"
              />
              <span className="text-caption">{t("emailHint")}</span>
            </label>
            {/* Bots fill every field; people never see this one. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="sr-only"
              aria-hidden="true"
            />
            <div className="flex items-center justify-between font-bold">
              <span>{t("total")}</span>
              <span className="tabular-nums" dir="ltr">
                {total}
              </span>
            </div>
            <p className="text-caption text-on-surface-variant">{t("payAtCounter")}</p>
            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-error-container p-sm text-body-sm text-on-error-container"
              >
                {error.text}
              </p>
            ) : null}
            <button
              type="button"
              disabled={pending || count === 0 || (!tableLabel && !name.trim())}
              onClick={send}
              className="flex h-12 items-center justify-center gap-xs rounded-full font-bold shadow-sm disabled:opacity-60"
              style={{ backgroundColor: c.primary, color: c.onPrimary }}
            >
              {pending ? (
                <Icon name="progress_activity" className="animate-spin text-icon-lg" />
              ) : null}
              {pending ? t("sending") : t("send", { total })}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
