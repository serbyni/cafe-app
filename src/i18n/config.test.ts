import { describe, expect, it } from "vitest";
import { acceptedLanguages, isRtl, pickLocale, uiLocaleFor } from "./config";

describe("language choice", () => {
  it("reads Accept-Language by preference", () => {
    expect(acceptedLanguages("fr-FR,fr;q=0.9,en;q=0.8")).toEqual(["fr", "fr", "en"]);
    expect(acceptedLanguages("en;q=0.5, ar-TN")).toEqual(["ar", "en"]);
    expect(acceptedLanguages("*")).toEqual([]);
    expect(acceptedLanguages(null)).toEqual([]);
  });

  it("prefers the visitor's choice, then the phone, then the café", () => {
    const offered = ["fr", "en", "ar"];
    expect(pickLocale({ cookie: "ar", acceptLanguage: "en", offered })).toBe("ar");
    expect(pickLocale({ cookie: null, acceptLanguage: "de-DE,en;q=0.7", offered })).toBe("en");
    expect(pickLocale({ cookie: null, acceptLanguage: "de-DE", offered })).toBe("fr");
    // A choice the café doesn't offer (anymore) is ignored.
    expect(pickLocale({ cookie: "it", acceptLanguage: "ar", offered })).toBe("ar");
  });

  it("knows RTL and interface fallbacks", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("fr")).toBe(false);
    expect(uiLocaleFor("it")).toBe("en");
    expect(uiLocaleFor("ar")).toBe("ar");
  });
});
