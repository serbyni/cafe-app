import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { HtmlLang } from "@/components/cafe/html-lang";
import { isRtl } from "@/i18n/config";
import { applyCafeLocale } from "@/i18n/cafe-locale";
import { isCafeSlug } from "@/lib/routing/host";

/**
 * Pages of ONE café. Reached only through the proxy rewrite of <slug>.<root>/* (the proxy
 * returns 404 for direct /tenant/* requests). Links inside café pages are host-relative
 * ("/menu"), never "/tenant/<slug>/menu".
 * Language: the visitor's choice → phone language → café's main language (src/i18n).
 */
async function CafeGate({
  params,
  children,
}: {
  params: LayoutProps<"/tenant/[slug]">["params"];
  children: React.ReactNode;
}) {
  const { slug } = await params;
  if (!isCafeSlug(slug)) notFound();
  const locale = await applyCafeLocale(slug);
  const dir = isRtl(locale) ? "rtl" : "ltr";
  return (
    <NextIntlClientProvider messages={await getMessages()}>
      <HtmlLang lang={locale} dir={dir} />
      <div lang={locale} dir={dir} className="flex min-h-screen flex-col">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

export default function CafeLayout({ params, children }: LayoutProps<"/tenant/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CafeGate params={params}>{children}</CafeGate>
    </Suspense>
  );
}
