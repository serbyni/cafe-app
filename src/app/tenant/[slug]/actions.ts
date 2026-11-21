"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { cafeLocale } from "@/i18n/cafe-locale";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/i18n/config";
import { notifyNewOrder, notifyTableMoved, publicCafes } from "@/lib/data/services/public-cafes";
import type { Spot } from "@/lib/location/location";
import { tooFarDetail, type PublicTable } from "@/lib/orders/schema";
import { TABLE_COOKIE, TABLE_COOKIE_MAX_AGE, TABLE_PICK_COOKIE } from "@/lib/routing/route";

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

const spotSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
});
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

/** Location problems of a table order or a table change (shown with a "Try again"). */
export type SpotFailure =
  | { ok: false; error: "location" }
  | { ok: false; error: "tooFar"; distance: number; radius: number };

function spotFailure(code: string, detail?: string): SpotFailure | null {
  if (code === "location_required") return { ok: false, error: "location" };
  if (code === "too_far") return { ok: false, error: "tooFar", ...tooFarDetail(detail) };
  return null;
}

const orderInput = z.object({
  customerName: z.string().trim().max(40),
  /** Optional: the receipt is e-mailed when the café accepts the order. */
  customerEmail: z.union([
    z.literal(""),
    z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254)),
  ]),
  note: z.string().trim().max(300),
  /** Phone position for a table order (compared with the café's, never stored). */
  spot: spotSchema.nullable().optional(),
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
    }
  | SpotFailure;

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
  const jar = await cookies();
  const tableCode = jar.get(TABLE_COOKIE)?.value ?? null;
  const tableId = jar.get(TABLE_PICK_COOKIE)?.value ?? null;
  const { locale } = await cafeLocale(slug);
  const r = await publicCafes.placeOrder({
    slug,
    tableCode: tableCode && /^[A-HJKMNP-Z2-9]{6}$/.test(tableCode) ? tableCode : null,
    tableId: isUuid(tableId) ? tableId : null,
    spot: parsed.data.spot ?? null,
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
  const spot = spotFailure(r.code, r.detail);
  if (spot) return spot;
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

/** Tables a customer can move to (picker; refreshed on demand). */
export async function freeTablesAction(slug: string): Promise<PublicTable[]> {
  return publicCafes.tables(slug);
}

export type ChooseTableResult = { ok: true; label: string } | { ok: false; error: "taken" };

/**
 * Before sending: remembers a table picked from the list (the cart stays as it is). The location
 * and the "free" rule are checked again when the order is sent.
 */
export async function chooseTableAction(slug: string, tableId: string): Promise<ChooseTableResult> {
  if (!isUuid(tableId)) return { ok: false, error: "taken" };
  const table = (await publicCafes.tables(slug)).find((t) => t.id === tableId);
  if (!table?.free) return { ok: false, error: "taken" };
  (await cookies()).set(TABLE_PICK_COOKIE, tableId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TABLE_COOKIE_MAX_AGE,
  });
  return { ok: true, label: table.label };
}

export type MoveOrderResult =
  { ok: true; label: string } | { ok: false; error: "taken" | "closed" | "generic" } | SpotFailure;

/** After sending: moves the order (new → ready) to a free table; the café's devices are told. */
export async function moveOrderAction(
  slug: string,
  token: string,
  tableId: string,
  spot: Spot | null,
): Promise<MoveOrderResult> {
  const s = spot === null ? null : spotSchema.safeParse(spot);
  if (!/^[0-9a-f]{32}$/.test(token) || !isUuid(tableId) || (s && !s.success))
    return { ok: false, error: "generic" };
  const r = await publicCafes.moveTable(slug, token, tableId, s?.success ? s.data : null);
  if (r.ok) {
    // Later orders from this phone go to the new table too.
    (await cookies()).set(TABLE_PICK_COOKIE, tableId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TABLE_COOKIE_MAX_AGE,
    });
    after(() => notifyTableMoved(slug, token));
    return { ok: true, label: r.tableLabel };
  }
  const f = spotFailure(r.code, r.detail);
  if (f) return f;
  if (r.code === "table_taken" || r.code === "invalid_input") return { ok: false, error: "taken" };
  if (r.code === "invalid_status") return { ok: false, error: "closed" };
  return { ok: false, error: "generic" };
}
