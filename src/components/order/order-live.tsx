"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { forgetOrder } from "@/lib/cart/cart";
import { subscribeToOrder } from "@/lib/data/order-updates";

/**
 * Keeps the order page live: refreshes on every change of the order (Realtime), with a 15 s
 * refresh as a safety net. A closed order is forgotten on this phone.
 */
export function OrderLive({
  slug,
  token,
  closed,
}: {
  slug: string;
  token: string;
  closed: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (closed) {
      forgetOrder(slug, token);
      return;
    }
    const off = subscribeToOrder(token, () => router.refresh());
    const poll = setInterval(() => router.refresh(), 15_000);
    return () => {
      clearInterval(poll);
      off();
    };
  }, [slug, token, closed, router]);
  return null;
}
