import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { themeSeed } from "@/lib/cafes/theme";
import { isCafeSlug } from "@/lib/routing/host";
import { publicEnv } from "@/lib/env";
import { rpcPublic } from "@/lib/supabase/public";
import { parseWebsite, type Website } from "@/lib/website/schema";
import { publicMenuSchema, type PublicMenu } from "@/lib/menu/public";
import type { Spot } from "@/lib/location/location";
import {
  openingSchema,
  orderSchema,
  publicTableSchema,
  type Order,
  type PublicTable,
} from "@/lib/orders/schema";
import { z } from "zod";

const orderingSchema = openingSchema.extend({ acceptingOrders: z.boolean() });
export type Ordering = z.infer<typeof orderingSchema>;
import { unwrap } from "../errors";

/** What a café shows its customers (get_public_cafe). Suspended cafés: name + colours only. */
export type PublicCafe =
  | {
      status: "active";
      /** Languages the café offers, its main language first. */
      locales: string[];
      slug: string;
      name: string;
      seed: string;
      locale: string;
      currency: string;
      countryCode: string;
      city: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      phone: string | null;
      email: string | null;
      facebook: string | null;
      instagram: string | null;
      /** Published website; null = the owner never published one (the page shows defaults). */
      website: Website | null;
    }
  | {
      status: "suspended";
      slug: string;
      name: string;
      seed: string;
      locale: string;
      locales: string[];
    };

/** Cache tag of one café's public data (for on-demand refresh later). */
export const cafeTag = (slug: string) => `cafe:${slug}`;

/**
 * Cached per café ("minutes" profile: refreshed every minute), so changes saved in the
 * owner's Settings (or a published website) appear within about a minute. Session-less client: public data only.
 */
async function cachedPublicCafe(slug: string): Promise<PublicCafe | null> {
  "use cache";
  cacheTag(cafeTag(slug));
  cacheLife("minutes");
  const [r] = unwrap("get_public_cafe", await rpcPublic("get_public_cafe", { p_slug: slug }));
  if (!r) return null;
  const base = {
    slug: r.slug,
    name: r.name,
    seed: themeSeed(r.theme),
    locale: r.default_locale,
    // Main language first (older rows / missing list → just the main language).
    locales: r.locales?.length ? r.locales : [r.default_locale],
  };
  if (r.status !== "active") return { ...base, status: "suspended" };
  return {
    ...base,
    status: "active",
    currency: r.currency,
    countryCode: r.country_code,
    city: r.city,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    phone: r.phone,
    email: r.contact_email,
    facebook: r.facebook_url,
    instagram: r.instagram_url,
    website: parseWebsite(r.website),
  };
}

/** Name of a live table code of this café ("T7"), cached like the café data. */
async function cachedTableLabel(slug: string, code: string): Promise<string | null> {
  "use cache";
  cacheTag(cafeTag(slug));
  cacheLife("minutes");
  const [r] = unwrap(
    "get_public_table",
    await rpcPublic("get_public_table", { p_slug: slug, p_code: code }),
  );
  return r?.label ?? null;
}

/** Customer menu, cached like the café data (sold-out changes show within about a minute). */
async function cachedMenu(slug: string): Promise<PublicMenu | null> {
  "use cache";
  cacheTag(cafeTag(slug));
  cacheLife("minutes");
  const raw = unwrap("get_public_menu", await rpcPublic("get_public_menu", { p_slug: slug }));
  if (!raw) return null;
  const parsed = publicMenuSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[data] get_public_menu: unexpected shape", parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}

/** Public café data for the café pages (anyone, signed in or not). */
export class PublicCafesService {
  /** The café with this address, or null when it does not exist. */
  get(slug: string): Promise<PublicCafe | null> {
    if (!isCafeSlug(slug)) return Promise.resolve(null);
    return cachedPublicCafe(slug);
  }

  /** The menu (visible categories with visible priced items), or null (inactive café). */
  menu(slug: string): Promise<PublicMenu | null> {
    if (!isCafeSlug(slug)) return Promise.resolve(null);
    return cachedMenu(slug);
  }

  /** Table name for a scanned table code, or null (unknown, retired or switched off). */
  tableLabel(slug: string, code: string | undefined): Promise<string | null> {
    if (!code || !isCafeSlug(slug) || !/^[A-HJKMNP-Z2-9]{6}$/.test(code))
      return Promise.resolve(null);
    return cachedTableLabel(slug, code);
  }

  /** Can customers order right now? (owner's switch + opening hours; never cached). */
  async ordering(slug: string): Promise<Ordering | null> {
    if (!isCafeSlug(slug)) return null;
    const { data, error } = await rpcPublic("get_public_ordering", { p_slug: slug });
    if (error || !data) return null;
    const parsed = orderingSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  /** A customer's order, by its secret token (never cached: it changes live). */
  async order(slug: string, token: string): Promise<Order | null> {
    if (!isCafeSlug(slug) || !/^[0-9a-f]{32}$/.test(token)) return null;
    const { data, error } = await rpcPublic("get_public_order", { p_slug: slug, p_token: token });
    if (error || !data) return null;
    const parsed = orderSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  /** Saves this phone for push notifications of the order (needs the order's secret token). */
  async saveOrderPush(
    slug: string,
    token: string,
    keys: { endpoint: string; p256dh: string; auth: string },
  ): Promise<boolean> {
    const { error } = await rpcPublic("save_order_push_subscription", {
      p_slug: slug,
      p_token: token,
      p_endpoint: keys.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
    });
    return !error;
  }

  /** Active tables with whether they are free right now (never cached). */
  async tables(slug: string): Promise<PublicTable[]> {
    if (!isCafeSlug(slug)) return [];
    const { data, error } = await rpcPublic("get_public_tables", { p_slug: slug });
    if (error || !data) return [];
    const parsed = z.array(publicTableSchema).safeParse(data);
    return parsed.success ? parsed.data : [];
  }

  /** Moves an open table order to a free table (order token = the proof; phone near the café). */
  async moveTable(
    slug: string,
    token: string,
    tableId: string,
    spot: Spot | null,
  ): Promise<{ ok: true; tableLabel: string } | { ok: false; code: string; detail?: string }> {
    const { data, error } = await rpcPublic("move_order_table", {
      p_slug: slug,
      p_token: token,
      p_table_id: tableId,
      p_lat: spot?.lat ?? null,
      p_lng: spot?.lng ?? null,
      p_accuracy: spot?.accuracy ?? null,
    });
    if (error) return { ok: false, code: error.message, detail: error.details };
    const r = data as { tableLabel?: string } | null;
    return r?.tableLabel ? { ok: true, tableLabel: r.tableLabel } : { ok: false, code: "unknown" };
  }

  /** Sends a cart. Errors keep the database code (+ detail: field or item id). */
  async placeOrder(input: {
    slug: string;
    tableCode: string | null;
    /** Table picked from the list (wins over the scanned code). */
    tableId: string | null;
    spot: Spot | null;
    customerName: string;
    customerEmail: string | null;
    items: { itemId: string; quantity: number; choices: string[]; note: string }[];
    note: string;
    locale: string;
  }): Promise<
    { ok: true; token: string; number: number } | { ok: false; code: string; detail?: string }
  > {
    const { data, error } = await rpcPublic("place_order", {
      p_slug: input.slug,
      p_table_code: input.tableCode,
      p_table_id: input.tableId,
      p_lat: input.spot?.lat ?? null,
      p_lng: input.spot?.lng ?? null,
      p_accuracy: input.spot?.accuracy ?? null,
      p_customer_name: input.customerName,
      p_customer_email: input.customerEmail,
      p_items: input.items,
      p_note: input.note,
      p_locale: input.locale,
    });
    if (error) {
      const e = error as { message: string; details?: string };
      return { ok: false, code: e.message, detail: e.details };
    }
    const r = data as { token?: string; number?: number } | null;
    return r?.token
      ? { ok: true, token: r.token, number: r.number ?? 0 }
      : { ok: false, code: "unknown" };
  }
}

export const publicCafes = new PublicCafesService();

/**
 * Asks the platform app to push a new order to the café's devices. The order token is the
 * secret; the platform sends at most once. Failures are ignored (the board still updates live).
 */
export async function notifyNewOrder(slug: string, token: string): Promise<void> {
  try {
    await fetch(new URL("/api/push/new-order", publicEnv().NEXT_PUBLIC_PLATFORM_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, token }),
      cache: "no-store",
    });
  } catch {
    /* platform unreachable: no push for this order */
  }
}

/** Asks the platform app to tell the café's devices that a customer moved their order. */
export async function notifyTableMoved(slug: string, token: string): Promise<void> {
  try {
    await fetch(new URL("/api/push/table-moved", publicEnv().NEXT_PUBLIC_PLATFORM_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, token }),
      cache: "no-store",
    });
  } catch {
    /* platform unreachable: the board still updates live */
  }
}
