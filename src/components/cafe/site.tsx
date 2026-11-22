import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { formatPhone, mapUrl, socialHandle } from "@/lib/cafes/contact";
import type { CafePalette } from "@/lib/cafes/theme";
import type { PublicCafe } from "@/lib/data/services/public-cafes";
import { publicEnv } from "@/lib/env";
import { cafeLocale } from "@/i18n/cafe-locale";
import { languageName } from "@/i18n/config";
import { groupHours, type OpeningDay } from "@/lib/website/schema";
import { LanguageSwitcher } from "./language-switcher";

/*
 * Frame of every café page (<slug>.<root>/…): header with the café name and the menu button,
 * footer with hours and contact, "Powered by Serbi". Café colours are runtime values from the
 * café's brand colour, so they are inline styles (not design tokens).
 */

type ActiveCafe = Extract<PublicCafe, { status: "active" }>;

export function CafeInitial({
  name,
  c,
  size = "md",
}: {
  name: string;
  c: CafePalette;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-bold ${
        size === "lg" ? "h-16 w-16 rounded-2xl text-display-lg" : "h-9 w-9 rounded-lg text-body-md"
      }`}
      style={{ backgroundColor: c.primary, color: c.onPrimary }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export async function SiteHeader({
  name,
  slug,
  c,
  showMenuButton = true,
}: {
  name: string;
  /** Café address (for its languages); omit to hide the language switcher. */
  slug?: string;
  c: CafePalette;
  showMenuButton?: boolean;
}) {
  const t = await getTranslations("site");
  const tl = await getTranslations("language");
  const lang = slug ? await cafeLocale(slug) : null;
  return (
    <header className="sticky top-0 z-40 border-b border-surface-container-high bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-sm px-gutter py-sm md:px-container-margin-desktop">
        <Link href="/" className="flex min-w-0 items-center gap-sm">
          <CafeInitial name={name} c={c} />
          <span className="truncate text-body-lg font-bold" style={{ color: c.primary }}>
            {name}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-xs">
          {lang ? (
            <LanguageSwitcher
              current={lang.locale}
              label={tl("choose")}
              options={lang.offered.map((code) => ({ code, name: languageName(code) }))}
            />
          ) : null}
          {showMenuButton ? (
            <Link
              href="/menu"
              className="inline-flex shrink-0 items-center gap-xs rounded-full px-md py-sm text-body-sm font-semibold shadow-sm"
              style={{ backgroundColor: c.primary, color: c.onPrimary }}
            >
              <Icon name="menu_book" className="text-icon-md" />
              {t("menuButton")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export async function PoweredBy() {
  const t = await getTranslations("site");
  return (
    <a
      href={publicEnv().NEXT_PUBLIC_PLATFORM_URL}
      className="mx-auto flex items-center gap-xs py-lg text-caption text-outline hover:text-on-surface-variant"
    >
      <BrandMark className="h-5 w-5" /> {t("poweredBy")}
    </a>
  );
}

function ContactLink({
  href,
  icon,
  children,
  external = false,
}: {
  href: string;
  icon: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex items-center gap-sm py-xs text-body-sm hover:underline"
    >
      <Icon name={icon} className="text-icon-lg" />
      <span className="min-w-0 truncate">{children}</span>
    </a>
  );
}

/** Opening hours (from the café's Settings, when set) + address, phone, email and social links. */
export async function SiteFooter({
  cafe,
  hours,
  c,
}: {
  cafe: ActiveCafe;
  hours: OpeningDay[] | null;
  c: CafePalette;
}) {
  const t = await getTranslations("site");
  const days = t.raw("days") as string[];
  const country = new Intl.DisplayNames([await getLocale()], { type: "region" }).of(
    cafe.countryCode,
  );
  const place = [cafe.city, country].filter(Boolean).join(", ");
  const hasPin = cafe.latitude !== null && cafe.longitude !== null;
  const mapHref = hasPin
    ? mapUrl(cafe.latitude!, cafe.longitude!)
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent([cafe.address, place].filter(Boolean).join(", "))}`;

  return (
    <footer id="visit" className="mt-xl" style={{ backgroundColor: c.variant, color: c.onVariant }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-lg px-gutter py-xl md:grid-cols-2 md:px-container-margin-desktop">
        {hours ? (
          <section aria-label={t("openingHours")}>
            <h2
              className="mb-sm flex items-center gap-xs text-label-sm uppercase"
              style={{ color: c.primary }}
            >
              <Icon name="schedule" className="text-icon-md" /> {t("openingHours")}
            </h2>
            <dl className="flex flex-col gap-xs text-body-md">
              {groupHours(hours, { days, closed: t("closed") }).map((g) => (
                <div key={g.days} className="flex justify-between gap-md">
                  <dt>{g.days}</dt>
                  <dd className="font-semibold" dir="ltr">
                    {g.hours}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <section aria-label={t("contact")}>
          <h2
            className="mb-sm flex items-center gap-xs text-label-sm uppercase"
            style={{ color: c.primary }}
          >
            <Icon name="storefront" className="text-icon-md" /> {t("visitUs")}
          </h2>
          {cafe.address || place ? (
            <ContactLink href={mapHref} icon="location_on" external>
              {[cafe.address, place].filter(Boolean).join(", ")}
            </ContactLink>
          ) : null}
          {cafe.phone ? (
            <ContactLink href={`tel:${cafe.phone}`} icon="call">
              <span dir="ltr">{formatPhone(cafe.phone)}</span>
            </ContactLink>
          ) : null}
          {cafe.email ? (
            <ContactLink href={`mailto:${cafe.email}`} icon="mail">
              {cafe.email}
            </ContactLink>
          ) : null}
          {cafe.instagram ? (
            <ContactLink href={cafe.instagram} icon="photo_camera" external>
              {t("instagram")} · <span dir="ltr">{socialHandle(cafe.instagram)}</span>
            </ContactLink>
          ) : null}
          {cafe.facebook ? (
            <ContactLink href={cafe.facebook} icon="thumb_up" external>
              {t("facebook")} · <span dir="ltr">{socialHandle(cafe.facebook)}</span>
            </ContactLink>
          ) : null}
        </section>
      </div>
      <div className="flex border-t border-outline-variant">
        <PoweredBy />
      </div>
    </footer>
  );
}

/** Suspended café: same page on every path. */
export async function SuspendedCafe({
  name,
  slug,
  c,
}: {
  name: string;
  slug?: string;
  c: CafePalette;
}) {
  const t = await getTranslations("site");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={name} slug={slug} c={c} showMenuButton={false} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
        <Icon name="schedule" className="text-icon-2xl text-outline" />
        <h1 className="text-headline-md text-on-surface">{t("suspendedTitle")}</h1>
        <p className="text-on-surface-variant">{t("suspendedBody")}</p>
      </main>
      <PoweredBy />
    </div>
  );
}
