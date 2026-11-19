import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { formatPhone, mapUrl, socialHandle } from "@/lib/cafes/contact";
import { cafePalette, type CafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/tenant/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await publicCafes.get(slug);
  if (!cafe) return { title: "Café not found" };
  return {
    title: { absolute: `${cafe.name} · Menu` },
    description: `${cafe.name} — menu and ordering on Serbi.`,
  };
}

function PoweredBy() {
  return (
    <a
      href={publicEnv().NEXT_PUBLIC_PLATFORM_URL}
      className="mx-auto flex items-center gap-xs py-lg text-caption text-outline hover:text-on-surface-variant"
    >
      <BrandMark className="h-5 w-5" /> Powered by Serbi
    </a>
  );
}

function Hero({ name, subtitle, c }: { name: string; subtitle?: string; c: CafePalette }) {
  return (
    <header style={{ backgroundColor: c.primary, color: c.onPrimary }}>
      <div className="mx-auto flex max-w-3xl items-center gap-md px-gutter pt-xl pb-xl">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-display-lg font-bold"
          style={{ backgroundColor: c.container, color: c.onContainer }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-display-lg font-bold">{name}</h1>
          {subtitle ? <p className="mt-xs text-body-md opacity-85">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}

function ContactRow({
  href,
  icon,
  label,
  value,
  c,
  external = false,
}: {
  href: string;
  icon: string;
  label: string;
  value: ReactNode;
  c: CafePalette;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="flex items-center gap-md px-md py-sm transition-colors hover:bg-surface-container-low"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: c.container, color: c.onContainer }}
        >
          <Icon name={icon} className="text-icon-lg" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-caption text-on-surface-variant">{label}</span>
          <span className="block truncate text-body-md font-semibold text-on-surface">{value}</span>
        </span>
        <Icon
          name={external ? "open_in_new" : "chevron_right"}
          className="text-icon-md text-outline"
          flipRtl={!external}
        />
      </a>
    </li>
  );
}

async function CafeHome({ params }: { params: PageProps<"/tenant/[slug]">["params"] }) {
  const { slug } = await params;
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);

  if (cafe.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-col">
        <Hero name={cafe.name} c={c} />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-sm px-gutter py-xl text-center">
          <Icon name="schedule" className="text-icon-2xl text-outline" />
          <h2 className="text-headline-md text-on-surface">Temporarily unavailable</h2>
          <p className="text-on-surface-variant">
            This café&apos;s menu is not available right now. Please check again later.
          </p>
        </main>
        <PoweredBy />
      </div>
    );
  }

  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(cafe.countryCode);
  const place = [cafe.city, country].filter(Boolean).join(", ");
  const hasPin = cafe.latitude !== null && cafe.longitude !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <Hero name={cafe.name} subtitle={place} c={c} />
      <main className="mx-auto -mt-md flex w-full max-w-3xl flex-1 flex-col gap-md px-gutter">
        <section className="rounded-2xl bg-surface-container-lowest p-lg text-center shadow-card-warm">
          <span
            className="mx-auto mb-sm flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: c.container, color: c.onContainer }}
          >
            <Icon name="restaurant_menu" className="text-icon-xl" />
          </span>
          <h2 className="text-headline-md text-on-surface">Menu coming soon</h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Soon you can browse the menu and order from your table right here.
          </p>
        </section>

        <section
          aria-label="Contact"
          className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm"
        >
          <ul className="divide-y divide-surface-container-high">
            {cafe.address || hasPin ? (
              <ContactRow
                href={
                  hasPin
                    ? mapUrl(cafe.latitude!, cafe.longitude!)
                    : `https://www.openstreetmap.org/search?query=${encodeURIComponent([cafe.address, place].filter(Boolean).join(", "))}`
                }
                icon="location_on"
                label="Address"
                value={cafe.address ?? place}
                c={c}
                external
              />
            ) : null}
            {cafe.phone ? (
              <ContactRow
                href={`tel:${cafe.phone}`}
                icon="call"
                label="Phone"
                value={formatPhone(cafe.phone)}
                c={c}
              />
            ) : null}
            {cafe.email ? (
              <ContactRow
                href={`mailto:${cafe.email}`}
                icon="mail"
                label="Email"
                value={cafe.email}
                c={c}
              />
            ) : null}
            {cafe.instagram ? (
              <ContactRow
                href={cafe.instagram}
                icon="photo_camera"
                label="Instagram"
                value={socialHandle(cafe.instagram)}
                c={c}
                external
              />
            ) : null}
            {cafe.facebook ? (
              <ContactRow
                href={cafe.facebook}
                icon="thumb_up"
                label="Facebook"
                value={socialHandle(cafe.facebook)}
                c={c}
                external
              />
            ) : null}
          </ul>
        </section>
      </main>
      <PoweredBy />
    </div>
  );
}

export default function CafePage({ params }: PageProps<"/tenant/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CafeHome params={params} />
    </Suspense>
  );
}
