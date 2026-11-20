import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiteFooter, SiteHeader, SuspendedCafe } from "@/components/cafe/site";
import { Hero, WebsiteSections } from "@/components/cafe/website-sections";
import { applyCafeLocale } from "@/i18n/cafe-locale";
import { cafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { mediaUrl } from "@/lib/media/config";
import { SPECIALTIES_MAX, defaultWebsite, type Website } from "@/lib/website/schema";

/** Default page of a café that never published a website, in the visitor's language. */
async function translatedDefault(name: string): Promise<Website> {
  const t = await getTranslations("home");
  const w = defaultWebsite({ name });
  w.hero.title = t("defaultTitle", { name }).slice(0, 80);
  w.hero.subtitle = t("defaultSubtitle");
  w.hero.highlights = [{ icon: "qr_code_scanner", label: t("defaultHighlight") }];
  w.sections = w.sections.map((s) =>
    s.type === "how_it_works"
      ? { ...s, title: t("defaultHowTitle"), text: t("defaultHowText") }
      : s,
  );
  return w;
}

export async function generateMetadata({ params }: PageProps<"/tenant/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await publicCafes.get(slug);
  await applyCafeLocale(slug);
  const t = await getTranslations();
  if (!cafe) return { title: t("notFound.metaTitle") };
  if (cafe.status !== "active") return { title: { absolute: cafe.name } };
  const site = cafe.website ?? (await translatedDefault(cafe.name));
  const description = site.hero.subtitle || t("home.metaDescription", { name: cafe.name });
  return {
    title: { absolute: cafe.name },
    description,
    openGraph: {
      title: cafe.name,
      description,
      ...(site.hero.image ? { images: [{ url: mediaUrl(site.hero.image.path) }] } : {}),
    },
  };
}

/**
 * Café home page (<slug>.<root>/): the website the owner published in the dashboard
 * (Website editor). Never published → a simple default page from the café's details
 * (no opening hours: we don't invent them).
 */
async function CafeHome({ params }: { params: PageProps<"/tenant/[slug]">["params"] }) {
  const { slug } = await params;
  await applyCafeLocale(slug);
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);
  if (cafe.status === "suspended") return <SuspendedCafe name={cafe.name} slug={slug} c={c} />;

  const website = cafe.website ?? (await translatedDefault(cafe.name));
  const menu = await publicCafes.menu(slug);
  const featured = (menu?.categories ?? [])
    .flatMap((cat) => cat.items)
    .filter((i) => i.isFeatured)
    .slice(0, SPECIALTIES_MAX);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={cafe.name} slug={slug} c={c} />
      <main className="flex-1">
        <Hero hero={website.hero} c={c} phone={cafe.phone} />
        <WebsiteSections
          website={website}
          c={c}
          featured={featured}
          currency={menu?.currency ?? ""}
        />
      </main>
      <SiteFooter cafe={cafe} hours={cafe.website ? website.footer.hours : null} c={c} />
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
