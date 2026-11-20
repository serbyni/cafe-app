import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { themeSeed } from "@/lib/cafes/theme";
import { isCafeSlug } from "@/lib/routing/host";
import { rpcPublic } from "@/lib/supabase/public";
import { parseWebsite, type Website } from "@/lib/website/schema";
import { publicMenuSchema, type PublicMenu } from "@/lib/menu/public";
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
}

export const publicCafes = new PublicCafesService();
