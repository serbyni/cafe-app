import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { themeSeed } from "@/lib/cafes/theme";
import { isCafeSlug } from "@/lib/routing/host";
import { createPublicClient } from "@/lib/supabase/public";
import { parseWebsite, type Website } from "@/lib/website/schema";
import { unwrap } from "../errors";

/** What a café shows its customers (get_public_cafe). Suspended cafés: name + colours only. */
export type PublicCafe =
  | {
      status: "active";
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
  | { status: "suspended"; slug: string; name: string; seed: string; locale: string };

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
  const [r] = unwrap(
    "get_public_cafe",
    await createPublicClient().rpc("get_public_cafe", { p_slug: slug }),
  );
  if (!r) return null;
  const base = { slug: r.slug, name: r.name, seed: themeSeed(r.theme), locale: r.default_locale };
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

/** Public café data for the café pages (anyone, signed in or not). */
export class PublicCafesService {
  /** The café with this address, or null when it does not exist. */
  get(slug: string): Promise<PublicCafe | null> {
    if (!isCafeSlug(slug)) return Promise.resolve(null);
    return cachedPublicCafe(slug);
  }
}

export const publicCafes = new PublicCafesService();
