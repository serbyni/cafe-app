import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isCafeSlug } from "@/lib/routing/host";

/**
 * Pages of ONE café. Reached only through the proxy rewrite of <slug>.<root>/* (the proxy
 * returns 404 for direct /tenant/* requests). Links inside café pages are host-relative
 * ("/menu"), never "/tenant/<slug>/menu".
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
  return children;
}

export default function CafeLayout({ params, children }: LayoutProps<"/tenant/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CafeGate params={params}>{children}</CafeGate>
    </Suspense>
  );
}
