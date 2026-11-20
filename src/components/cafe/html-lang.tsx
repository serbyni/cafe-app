"use client";

import { useEffect } from "react";

/**
 * Sets <html lang/dir> for the café's language. The root <html> is part of the static shell
 * (rendered before the language is known), so the café layout applies it here; the café content
 * itself also carries lang/dir, so layout and text direction are right from the first paint.
 */
export function HtmlLang({ lang, dir }: { lang: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
  }, [lang, dir]);
  return null;
}
