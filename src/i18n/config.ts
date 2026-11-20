/*
 * Interface languages of the café site (buttons, labels, messages). Content languages (menu,
 * website texts) are chosen per café; an unsupported interface language falls back to English.
 */

export const UI_LOCALES = ["en", "fr", "ar"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
export const DEFAULT_UI_LOCALE: UiLocale = "en";

/** Cookie holding the visitor's explicit language choice (host-only: one café). */
export const LANG_COOKIE = "serbi_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Names shown in the language switcher, in their own language. */
export const LANGUAGE_NAMES: Record<UiLocale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

export const isUiLocale = (v: unknown): v is UiLocale =>
  typeof v === "string" && (UI_LOCALES as readonly string[]).includes(v);

export const isRtl = (locale: string) => ["ar", "he", "fa", "ur"].includes(locale.split("-")[0]);

/**
 * Languages from an Accept-Language header, best first: "fr-FR,fr;q=0.9,en;q=0.8" →
 * ["fr", "fr", "en"] (base language only).
 */
export function acceptedLanguages(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(
        params
          .find((p) => p.trim().startsWith("q="))
          ?.trim()
          .slice(2) ?? "1",
      );
      return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isNaN(q) ? 0 : q, i };
    })
    .filter((x) => x.lang && x.lang !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
    .map((x) => x.lang);
}

/**
 * The visitor's language for one café: their explicit choice (cookie), else the first phone
 * language the café offers, else the café's main language. `offered` = languages the café
 * offers (its main language first).
 */
export function pickLocale(input: {
  cookie: string | null | undefined;
  acceptLanguage: string | null | undefined;
  offered: readonly string[];
}): string {
  const { offered } = input;
  if (input.cookie && offered.includes(input.cookie)) return input.cookie;
  const fromPhone = acceptedLanguages(input.acceptLanguage).find((l) => offered.includes(l));
  return fromPhone ?? offered[0] ?? DEFAULT_UI_LOCALE;
}

/** Interface language for a (content) language: itself when translated, else English. */
export const uiLocaleFor = (locale: string): UiLocale =>
  isUiLocale(locale) ? locale : DEFAULT_UI_LOCALE;

/** A language's name in that language ("Français", "العربية", "Italiano"). */
export function languageName(code: string): string {
  if (isUiLocale(code)) return LANGUAGE_NAMES[code];
  try {
    const n = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return n ? n.charAt(0).toLocaleUpperCase(code) + n.slice(1) : code;
  } catch {
    return code;
  }
}
