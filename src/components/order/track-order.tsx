"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { loadOrders, type SavedOrder } from "@/lib/cart/cart";
import type { CafePalette } from "@/lib/cafes/theme";

/** "Your order #12 — follow it" while an order placed from this phone is recent. */
export function TrackOrder({ slug, c }: { slug: string; c: CafePalette }) {
  const t = useTranslations("order");
  const [last, setLast] = useState<SavedOrder | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setLast(loadOrders(slug)[0] ?? null), 0);
    return () => clearTimeout(id);
  }, [slug]);
  if (!last) return null;
  return (
    <Link
      href={`/order/${last.token}`}
      className="flex items-center gap-sm rounded-2xl p-md font-semibold shadow-sm"
      style={{ backgroundColor: c.container, color: c.onContainer }}
    >
      <Icon name="receipt_long" className="text-icon-xl" />
      <span className="flex-1">{t("trackOrder", { number: last.number })}</span>
      <Icon name="arrow_forward" className="text-icon-lg" flipRtl />
    </Link>
  );
}
