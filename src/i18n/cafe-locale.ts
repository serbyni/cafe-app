import "server-only";
import { cookies, headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { LANG_COOKIE, UI_LOCALES, pickLocale, uiLocaleFor } from "./config";

/** Languages a café offers, its main language first (step 2: the café's own list). */
export async function offeredLocales(slug: string): Promise<string[]> {
  const cafe = await publicCafes.get(slug);
  const main = cafe?.locale ?? "en";
  return [main, ...UI_LOCALES.filter((l) => l !== main)];
}

/**
 * The visitor's language on this café's site (choice cookie → phone → café), computed once per
 * request and registered with next-intl for the current layout/page.
 */
export const cafeLocale = cache(
  async (slug: string): Promise<{ locale: string; offered: string[] }> => {
    const [jar, h, offered] = await Promise.all([cookies(), headers(), offeredLocales(slug)]);
    const locale = pickLocale({
      cookie: jar.get(LANG_COOKIE)?.value,
      acceptLanguage: h.get("accept-language"),
      offered,
    });
    return { locale, offered };
  },
);

/** Registers the café's visitor language for next-intl (call at the top of layouts and pages). */
export async function applyCafeLocale(slug: string): Promise<string> {
  const { locale } = await cafeLocale(slug);
  setRequestLocale(uiLocaleFor(locale));
  return locale;
}
