import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { formatPhone, mapUrl, socialHandle } from "@/lib/cafes/contact";
import type { CafePalette } from "@/lib/cafes/theme";
import type { PublicCafe } from "@/lib/data/services/public-cafes";
import { publicEnv } from "@/lib/env";
import { groupHours, type OpeningDay } from "@/lib/website/schema";

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

export function SiteHeader({
  name,
  c,
  showMenuButton = true,
}: {
  name: string;
  c: CafePalette;
  showMenuButton?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-container-high bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-sm px-gutter py-sm md:px-container-margin-desktop">
        <Link href="/" className="flex min-w-0 items-center gap-sm">
          <CafeInitial name={name} c={c} />
          <span className="truncate text-body-lg font-bold" style={{ color: c.primary }}>
            {name}
          </span>
        </Link>
        {showMenuButton ? (
          <Link
            href="/menu"
            className="inline-flex shrink-0 items-center gap-xs rounded-full px-md py-sm text-body-sm font-semibold shadow-sm"
            style={{ backgroundColor: c.primary, color: c.onPrimary }}
          >
            <Icon name="menu_book" className="text-icon-md" />
            Menu
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function PoweredBy() {
  return (
    <a
      href={publicEnv().NEXT_PUBLIC_PLATFORM_URL}
      className="mx-auto flex items-center gap-xs py-lg text-caption text-outline hover:text-on-surface-variant"
    >
      <BrandMark className="h-5 w-5" /> Powered by Serbi
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

/** Opening hours (when the café published them) + address, phone, email and social links. */
export function SiteFooter({
  cafe,
  hours,
  c,
}: {
  cafe: ActiveCafe;
  hours: OpeningDay[] | null;
  c: CafePalette;
}) {
  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(cafe.countryCode);
  const place = [cafe.city, country].filter(Boolean).join(", ");
  const hasPin = cafe.latitude !== null && cafe.longitude !== null;
  const mapHref = hasPin
    ? mapUrl(cafe.latitude!, cafe.longitude!)
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent([cafe.address, place].filter(Boolean).join(", "))}`;

  return (
    <footer id="visit" className="mt-xl" style={{ backgroundColor: c.variant, color: c.onVariant }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-lg px-gutter py-xl md:grid-cols-2 md:px-container-margin-desktop">
        {hours ? (
          <section aria-label="Opening hours">
            <h2
              className="mb-sm flex items-center gap-xs text-label-sm uppercase"
              style={{ color: c.primary }}
            >
              <Icon name="schedule" className="text-icon-md" /> Opening hours
            </h2>
            <dl className="flex flex-col gap-xs text-body-md">
              {groupHours(hours).map((g) => (
                <div key={g.days} className="flex justify-between gap-md">
                  <dt>{g.days}</dt>
                  <dd className="font-semibold">{g.hours}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <section aria-label="Contact">
          <h2
            className="mb-sm flex items-center gap-xs text-label-sm uppercase"
            style={{ color: c.primary }}
          >
            <Icon name="storefront" className="text-icon-md" /> Visit us
          </h2>
          {cafe.address || place ? (
            <ContactLink href={mapHref} icon="location_on" external>
              {[cafe.address, place].filter(Boolean).join(", ")}
            </ContactLink>
          ) : null}
          {cafe.phone ? (
            <ContactLink href={`tel:${cafe.phone}`} icon="call">
              {formatPhone(cafe.phone)}
            </ContactLink>
          ) : null}
          {cafe.email ? (
            <ContactLink href={`mailto:${cafe.email}`} icon="mail">
              {cafe.email}
            </ContactLink>
          ) : null}
          {cafe.instagram ? (
            <ContactLink href={cafe.instagram} icon="photo_camera" external>
              Instagram · {socialHandle(cafe.instagram)}
            </ContactLink>
          ) : null}
          {cafe.facebook ? (
            <ContactLink href={cafe.facebook} icon="thumb_up" external>
              Facebook · {socialHandle(cafe.facebook)}
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
export function SuspendedCafe({ name, c }: { name: string; c: CafePalette }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={name} c={c} showMenuButton={false} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
        <Icon name="schedule" className="text-icon-2xl text-outline" />
        <h1 className="text-headline-md text-on-surface">Temporarily unavailable</h1>
        <p className="text-on-surface-variant">
          This café&apos;s page is not available right now. Please check again later.
        </p>
      </main>
      <PoweredBy />
    </div>
  );
}
