import { getRequestConfig } from "next-intl/server";
import { DEFAULT_UI_LOCALE, uiLocaleFor } from "./config";

/**
 * next-intl request config. The language is not in the URL: café pages compute it
 * (cafeLocale) and pass it with setRequestLocale(); everything else uses English.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = uiLocaleFor((await requestLocale) ?? DEFAULT_UI_LOCALE);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
