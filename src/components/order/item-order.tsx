"use client";

import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import type { PublicMenuItem } from "@/lib/menu/public";
import { formatPrice, invalidOptionGroup, unitPrice } from "@/lib/menu/schema";
import { useCart } from "./cart-context";

/**
 * Bottom of the item sheet when the café takes orders: options (radio for "choose 1", checkboxes
 * for "up to N"), quantity, note and the "Add · price" button.
 */
export function ItemOrder({
  item,
  currency,
  c,
  onAdded,
}: {
  item: PublicMenuItem;
  currency: string;
  c: CafePalette;
  onAdded: () => void;
}) {
  const t = useTranslations("order");
  const cart = useCart();
  const [picked, setPicked] = useState<string[]>(() =>
    // Preselect the first available choice of required single-choice groups.
    item.options
      .filter((g) => g.min === 1 && g.max === 1)
      .map((g) => g.choices.find((ch) => ch.isAvailable)?.id)
      .filter((id): id is string => !!id),
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  if (!cart) return null;
  const bad = invalidOptionGroup(item.options, picked);
  const price = unitPrice(item.price, item.options, picked);
  const primary: CSSProperties = { backgroundColor: c.primary, color: c.onPrimary };

  const toggle = (groupId: string, choiceId: string, single: boolean, max: number) =>
    setPicked((p) => {
      const g = item.options.find((x) => x.id === groupId)!;
      const inGroup = new Set(g.choices.map((ch) => ch.id));
      if (single) return [...p.filter((id) => !inGroup.has(id)), choiceId];
      if (p.includes(choiceId)) return p.filter((id) => id !== choiceId);
      if (p.filter((id) => inGroup.has(id)).length >= max) return p;
      return [...p, choiceId];
    });

  return (
    <div className="flex flex-col gap-md border-t border-surface-container-high pt-md">
      {item.options.map((g) => {
        const single = g.max === 1;
        const err = tried && bad === g.id;
        return (
          <fieldset key={g.id} className="flex flex-col gap-xs">
            <legend className="mb-xs flex w-full items-center justify-between gap-sm">
              <span className="font-semibold text-on-surface" dir="auto">
                {g.name}
              </span>
              <span
                className={`rounded-full px-sm text-caption font-semibold ${err ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant"}`}
              >
                {g.min === 1
                  ? t("required")
                  : single
                    ? t("chooseOne")
                    : t("chooseUpTo", { count: g.max })}
              </span>
            </legend>
            {g.choices.map((ch) => {
              const on = picked.includes(ch.id);
              return (
                <label
                  key={ch.id}
                  className={`flex cursor-pointer items-center justify-between gap-sm rounded-xl border px-md py-sm ${on ? "border-transparent" : "border-surface-container-high"} ${ch.isAvailable ? "" : "cursor-not-allowed opacity-50"}`}
                  style={on ? { backgroundColor: c.container, color: c.onContainer } : undefined}
                >
                  <span className="flex items-center gap-sm">
                    <input
                      type={single ? "radio" : "checkbox"}
                      name={`opt-${g.id}`}
                      checked={on}
                      disabled={!ch.isAvailable}
                      onChange={() => toggle(g.id, ch.id, single, g.max)}
                      className="h-4 w-4"
                      style={{ accentColor: c.primary }}
                    />
                    <span dir="auto">{ch.name}</span>
                    {!ch.isAvailable ? (
                      <span className="text-caption">({t("unavailable")})</span>
                    ) : null}
                  </span>
                  {ch.price ? (
                    <span className="text-body-sm tabular-nums" dir="ltr">
                      +{formatPrice(ch.price, currency)}
                    </span>
                  ) : null}
                </label>
              );
            })}
            {err ? (
              <p role="alert" className="text-body-xs text-error">
                {t("pickRequired")}
              </p>
            ) : null}
          </fieldset>
        );
      })}
      <label className="flex flex-col gap-xs text-body-sm text-on-surface-variant">
        {t("itemNote")}
        <input
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("itemNotePlaceholder")}
          className="rounded-xl border border-surface-container-high bg-transparent px-md py-sm text-body-md text-on-surface focus:outline-none"
          dir="auto"
        />
      </label>
      <div className="flex items-center gap-sm">
        <div
          className="flex items-center rounded-full border border-surface-container-high"
          role="group"
          aria-label={t("quantity")}
        >
          <button
            type="button"
            aria-label={t("less")}
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
          >
            <Icon name="remove" className="text-icon-lg" />
          </button>
          <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label={t("more")}
            disabled={qty >= 20}
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
          >
            <Icon name="add" className="text-icon-lg" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (bad) {
              setTried(true);
              return;
            }
            cart.add({
              itemId: item.id,
              name: item.name,
              choices: picked,
              choiceNames: item.options
                .flatMap((g) => g.choices)
                .filter((ch) => picked.includes(ch.id))
                .map((ch) => ch.name),
              unitPrice: price,
              quantity: qty,
              note,
            });
            onAdded();
          }}
          className="flex h-12 flex-1 items-center justify-center gap-xs rounded-full font-bold shadow-sm"
          style={primary}
        >
          <Icon name="add_shopping_cart" className="text-icon-lg" />
          {t("addToOrder", { price: formatPrice(price * qty, currency) })}
        </button>
      </div>
    </div>
  );
}
