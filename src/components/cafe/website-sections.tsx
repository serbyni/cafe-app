import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";
import type { CafePalette } from "@/lib/cafes/theme";
import { mediaUrl } from "@/lib/media/config";
import type { Website, WebsiteImage, WebsiteSection } from "@/lib/website/schema";

/*
 * Sections of the café website (published document from the owner's Website editor).
 * Layout follows the Stitch landing page: phone-first, two columns from md.
 */

type Section<T extends WebsiteSection["type"]> = Extract<WebsiteSection, { type: T }>;

const container = "mx-auto w-full max-w-6xl px-gutter md:px-container-margin-desktop";

function Photo({
  image,
  className,
  priority = false,
}: {
  image: WebsiteImage;
  className: string;
  priority?: boolean;
}) {
  return (
    // Photos are resized on upload (≤1600px WebP) and served from the public media bucket.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(image.path)}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}

/** Small label above a section title; hidden when the owner's title already says the same. */
function Eyebrow({
  icon,
  children,
  title,
  c,
}: {
  icon: string;
  children: string;
  title: string;
  c: CafePalette;
}) {
  if (children.trim().toLowerCase() === title.trim().toLowerCase()) return null;
  return (
    <p className="flex items-center gap-xs text-label-sm uppercase" style={{ color: c.primary }}>
      <Icon name={icon} className="text-icon-md" />
      {children}
    </p>
  );
}

export function Hero({
  hero,
  c,
  phone,
}: {
  hero: Website["hero"];
  c: CafePalette;
  phone: string | null;
}) {
  const soft: CSSProperties = { backgroundColor: c.container, color: c.onContainer };
  return (
    <section
      className={`${container} grid grid-cols-1 items-center gap-lg py-lg md:grid-cols-2 md:py-xl`}
    >
      <div className="flex flex-col gap-md">
        {hero.badge ? (
          <p className="w-fit rounded-full px-sm py-xs text-label-sm uppercase" style={soft}>
            {hero.badge}
          </p>
        ) : null}
        <h1 className="text-display-lg" style={{ color: c.primary }}>
          {hero.title}
        </h1>
        {hero.subtitle ? (
          <p className="text-body-lg text-on-surface-variant">{hero.subtitle}</p>
        ) : null}
        <div className="flex flex-wrap gap-sm">
          <Link
            href="/menu"
            className="inline-flex flex-1 items-center justify-center gap-xs rounded-full px-lg py-sm font-semibold shadow-sm sm:flex-none"
            style={{ backgroundColor: c.primary, color: c.onPrimary }}
          >
            <Icon name="menu_book" className="text-icon-lg" /> View menu
          </Link>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex flex-1 items-center justify-center gap-xs rounded-full px-lg py-sm font-semibold sm:flex-none"
              style={soft}
            >
              <Icon name="call" className="text-icon-lg" /> Call us
            </a>
          ) : null}
        </div>
        {hero.highlights.length ? (
          <ul className="flex flex-wrap gap-xs">
            {hero.highlights.map((h) => (
              <li
                key={`${h.icon}-${h.label}`}
                className="inline-flex items-center gap-xs rounded-full bg-surface-container-low px-sm py-xs text-body-sm text-on-surface-variant"
              >
                <span className="flex" style={{ color: c.primary }}>
                  <Icon name={h.icon} className="text-icon-md" />
                </span>
                {h.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hero.image ? (
        <Photo
          image={hero.image}
          priority
          className="aspect-video w-full rounded-2xl shadow-card-warm md:aspect-square"
        />
      ) : null}
    </section>
  );
}

const STEPS = [
  {
    icon: "qr_code_scanner",
    title: "Scan",
    text: "Scan the QR code on your table — no app needed.",
  },
  { icon: "restaurant_menu", title: "Choose", text: "Browse the menu and pick what you like." },
  {
    icon: "notifications_active",
    title: "Enjoy",
    text: "We prepare your order. Pay at the counter.",
  },
];

export function HowItWorks({ s, c }: { s: Section<"how_it_works">; c: CafePalette }) {
  return (
    <section className={`${container} py-lg`}>
      <div className="flex flex-col gap-md rounded-2xl bg-surface-container-low p-lg md:p-xl">
        <Eyebrow icon="qr_code_2" title={s.title} c={c}>
          How it works
        </Eyebrow>
        <h2 className="text-headline-md" style={{ color: c.primary }}>
          {s.title}
        </h2>
        {s.text ? <p className="text-body-md text-on-surface-variant">{s.text}</p> : null}
        <ol className="grid grid-cols-1 gap-sm md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.icon}
              className="flex items-start gap-md rounded-xl bg-surface-container-lowest p-md shadow-sm"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: c.container, color: c.onContainer }}
              >
                <Icon name={step.icon} className="text-icon-lg" />
              </span>
              <span>
                <span className="block font-semibold text-on-surface">
                  {i + 1}. {step.title}
                </span>
                <span className="block text-body-sm text-on-surface-variant">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Story({ s, c }: { s: Section<"story">; c: CafePalette }) {
  return (
    <section className={`${container} grid grid-cols-1 items-start gap-lg py-lg md:grid-cols-2`}>
      {s.image ? (
        <Photo
          image={s.image}
          className="aspect-video w-full rounded-2xl shadow-card-warm md:aspect-square"
        />
      ) : null}
      <div className={`flex flex-col gap-md ${s.image ? "" : "md:col-span-2"}`}>
        <Eyebrow icon="auto_stories" title={s.title} c={c}>
          Our story
        </Eyebrow>
        <h2 className="text-headline-md" style={{ color: c.primary }}>
          {s.title}
        </h2>
        <p className="text-body-md whitespace-pre-line text-on-surface-variant">{s.text}</p>
        {s.points.length ? (
          <ul className="flex flex-col gap-sm">
            {s.points.map((p) => (
              <li
                key={p.title}
                className="flex items-start gap-sm rounded-xl bg-surface-container-lowest p-md shadow-sm"
              >
                <span className="flex" style={{ color: c.primary }}>
                  <Icon name="check_circle" className="text-icon-lg" />
                </span>
                <span>
                  <span className="block font-semibold text-on-surface">{p.title}</span>
                  {p.text ? (
                    <span className="block text-body-sm text-on-surface-variant">{p.text}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {s.quote ? (
          <figure
            className="rounded-xl border-s-4 bg-surface-container p-md"
            style={{ borderColor: c.primary }}
          >
            <blockquote className="text-body-md text-on-surface italic">“{s.quote}”</blockquote>
            {s.quoteAuthor ? (
              <figcaption className="mt-xs text-body-sm font-semibold" style={{ color: c.primary }}>
                {s.quoteAuthor}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </section>
  );
}

export function Gallery({ s, c }: { s: Section<"gallery">; c: CafePalette }) {
  return (
    <section className={`${container} flex flex-col gap-md py-lg`}>
      <Eyebrow icon="photo_library" title={s.title} c={c}>
        Gallery
      </Eyebrow>
      <h2 className="text-headline-md" style={{ color: c.primary }}>
        {s.title}
      </h2>
      <ul className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {s.images.map((img) => (
          <li key={img.path}>
            <Photo image={img} className="aspect-square w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Enabled sections in the owner's order. */
export function WebsiteSections({ website, c }: { website: Website; c: CafePalette }) {
  return website.sections
    .filter((s) => s.enabled)
    .map((s) => {
      switch (s.type) {
        case "how_it_works":
          return <HowItWorks key={s.type} s={s} c={c} />;
        case "story":
          return <Story key={s.type} s={s} c={c} />;
        case "gallery":
          return <Gallery key={s.type} s={s} c={c} />;
      }
    });
}
