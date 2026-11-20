"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/i18n/config";

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
