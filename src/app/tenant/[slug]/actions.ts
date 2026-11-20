"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { cafeLocale } from "@/i18n/cafe-locale";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/i18n/config";
import { notifyNewOrder, publicCafes } from "@/lib/data/services/public-cafes";
import { TABLE_COOKIE } from "@/lib/routing/route";

/** Remembers the visitor's language on this café's site (host-only cookie, one year). */
export async function setLanguageAction(locale: string): Promise<void> {
  if (!/^[a-z]{2}$/.test(locale)) return;
  (await cookies()).set(LANG_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: LANG_COOKIE_MAX_AGE,
  });
}

const orderInput = z.object({
  customerName: z.string().trim().max(40),
  /** Optional: the receipt is e-mailed when the café accepts the order. */
  customerEmail: z.union([
    z.literal(""),
    z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254)),
  ]),
  note: z.string().trim().max(300),
  /** Hidden field: bots fill it, people don't. */
  website: z.string().max(0),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
        choices: z.array(z.string().max(40)).max(72),
        note: z.string().trim().max(140),
      }),
    )
    .min(1)
    .max(30),
});

export type PlaceOrderResult =
  | { ok: true; token: string; number: number }
  | {
      ok: false;
      error: "closed" | "unavailable" | "tooMany" | "name" | "email" | "table" | "generic";
      itemId?: string;
    };

/**
 * Sends the cart. The table comes from the QR cookie (never from the browser's form); every price
 * and rule is checked again by place_order.
 */
export async function placeOrderAction(slug: string, input: unknown): Promise<PlaceOrderResult> {
  const parsed = orderInput.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error: field === "customerName" ? "name" : field === "customerEmail" ? "email" : "generic",
    };
  }
  const tableCode = (await cookies()).get(TABLE_COOKIE)?.value ?? null;
  const { locale } = await cafeLocale(slug);
  const r = await publicCafes.placeOrder({
    slug,
    tableCode: tableCode && /^[A-HJKMNP-Z2-9]{6}$/.test(tableCode) ? tableCode : null,
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail || null,
    items: parsed.data.items,
    note: parsed.data.note,
    locale,
  });
  if (r.ok) {
    // Push the new order to the café's devices (platform app), after the response.
    after(() => notifyNewOrder(slug, r.token));
    return r;
  }
  switch (r.code) {
    case "ordering_closed":
      return { ok: false, error: "closed" };
    case "item_unavailable":
      return { ok: false, error: "unavailable", itemId: r.detail };
    case "too_many_orders":
      return { ok: false, error: "tooMany" };
    case "invalid_input":
      return {
        ok: false,
        error:
          r.detail === "customer_name"
            ? "name"
            : r.detail === "customer_email"
              ? "email"
              : r.detail === "table"
                ? "table"
                : "generic",
      };
    default:
      return { ok: false, error: "generic" };
  }
}

const pushKeys = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  p256dh: z.string().min(20).max(200),
  auth: z.string().min(10).max(100),
});

/** This phone gets a push for every update of the order (token = the order's secret). */
export async function saveOrderPushAction(
  slug: string,
  token: string,
  keys: unknown,
): Promise<boolean> {
  const parsed = pushKeys.safeParse(keys);
  if (!parsed.success || !/^[0-9a-f]{32}$/.test(token)) return false;
  return publicCafes.saveOrderPush(slug, token, parsed.data);
}
