import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter, SiteHeader, SuspendedCafe } from "@/components/cafe/site";
import { Hero, WebsiteSections } from "@/components/cafe/website-sections";
import { cafePalette } from "@/lib/cafes/theme";
import { publicCafes } from "@/lib/data/services/public-cafes";
import { mediaUrl } from "@/lib/media/config";
import { SPECIALTIES_MAX, defaultWebsite } from "@/lib/website/schema";

export async function generateMetadata({ params }: PageProps<"/tenant/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await publicCafes.get(slug);
  if (!cafe) return { title: "Café not found" };
  if (cafe.status !== "active") return { title: { absolute: cafe.name } };
  const site = cafe.website ?? defaultWebsite(cafe);
  const description = site.hero.subtitle || `${cafe.name} — menu and ordering on Serbi.`;
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
  const cafe = await publicCafes.get(slug);
  if (!cafe) notFound();
  const c = cafePalette(cafe.seed);
  if (cafe.status === "suspended") return <SuspendedCafe name={cafe.name} c={c} />;

  const website = cafe.website ?? defaultWebsite(cafe);
  const menu = await publicCafes.menu(slug);
  const featured = (menu?.categories ?? [])
    .flatMap((cat) => cat.items)
    .filter((i) => i.isFeatured)
    .slice(0, SPECIALTIES_MAX);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={cafe.name} c={c} />
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
